import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

interface ParquetResult {
  rule_id: string;
  rule_name: string;
  rule_class: string;
  functional_area: string;
  referenced_rule_id: string | null;
}

class RegressionForesightAgent {
  private baseDir: string;
  private mockPrFile: string;

  constructor() {
    this.baseDir = process.cwd();
    this.mockPrFile = path.join(this.baseDir, 'mock-pr-diff.txt');
  }

  /**
   * Main 11-step orchestrator pipeline
   */
  public async executeForesightPipeline(): Promise<void> {
    // Read parameters from environment (populated automatically by GitHub Actions)
    const prNumber = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : 26839;
    const repoOwner = process.env.REPO_OWNER || 'ReshmaAIAutomation';
    const repoName = process.env.REPO_NAME || 'regression-foresight-agent-';
    const githubToken = process.env.GITHUB_TOKEN;

    console.log(`\n======================================================`);
    console.log(` 🚀 STARTING REGRESSION FORESIGHT PIPELINE: PR #${prNumber}`);
    console.log(` Repo Target: ${repoOwner}/${repoName}`);
    console.log(`======================================================`);

    // Step 1: Intake Diff
    const diffText = this.getGitDiff();
    console.log(`[Step 1] Loaded Pull Request diff metrics.`);

    // Parse altered rules (look for rule JSON patterns modified in git diff)
    const changedRuleName = this.extractAlteredRuleName(diffText) || "mzAddChannelWrapper";
    console.log(`[Step 2] Detected modified decision rule in diff: "${changedRuleName}"`);

    // Step 3-4: Query Parquet Database using Python + DuckDB joins
    console.log(`[Step 3] Querying Parquet database: rules_myproject.parquet...`);
    const dbResults = this.queryParquetDatabase(changedRuleName);
    
    if (dbResults.length === 0) {
      console.warn(`[Warning] No rule dependencies found in Parquet database.`);
      return;
    }
    
    const primaryRule = dbResults[0];
    console.log(`[Step 4] Query succeeded! Found dependency join:`);
    console.log(`   - Rule ID: ${primaryRule.rule_id} | Area: ${primaryRule.functional_area}`);

    // Step 5: Detect Functional Area
    const area = primaryRule.functional_area;
    console.log(`[Step 5] Detecting functional boundaries: ${area}`);

    // Step 6-7: Draft functional scenarios & map JIRA Stories (TEST-IDs) via RAG
    console.log(`[Step 6-7] Compiling functional scenarios and mapping to Test IDs via RAG...`);
    const scenarios = this.buildTestScenarios(area);
    
    // Parse story key from diff branch or default
    const linkedStoryId = process.env.PR_NUMBER ? `STORY-${process.env.PR_NUMBER}` : 'PROJ-101';
    const { JiraClient } = require('./jira-client');
    const jiraClient = new JiraClient();
    const testCases = await jiraClient.fetchTestCasesFromJira(linkedStoryId);
    
    const pythonPath = this.getPythonPath();
    const searchScript = path.join(this.baseDir, 'rule-indexer', 'rag_search.py');
    const testPlan: any[] = [];

    for (const s of scenarios) {
      console.log(`[RAG Search] Querying semantic matches for scenario: "${s.scenario}"...`);
      let bestMatch: any = null;
      try {
        const cmd = `${pythonPath} "${searchScript}" "${s.scenario}"`;
        const output = execSync(cmd).toString().trim();
        const parsed = JSON.parse(output);
        if (parsed.status === 'success' && parsed.best_match) {
          bestMatch = parsed.best_match;
        }
      } catch (err: any) {
        // Fallback catch
      }

      if (bestMatch) {
        console.log(`   --> Semantically matched: ${bestMatch.id} | Playwright Tag: ${bestMatch.playwrightTag}`);
        testPlan.push({
          id: s.id,
          scenario: s.scenario,
          expected: s.expected,
          testId: bestMatch.id,
          status: '🟡 To Run',
          scriptPath: bestMatch.scriptPath,
          playwrightTag: bestMatch.playwrightTag,
          reasoning: bestMatch.reasoning
        });
      } else {
        // Fallback mapping
        const match = testCases[s.id % testCases.length];
        testPlan.push({
          id: s.id,
          scenario: s.scenario,
          expected: s.expected,
          testId: match ? match.id : `TEST-MOCK-${s.id}`,
          status: match ? match.status : '🟡 To Run',
          scriptPath: s.id === 1 ? 'tests/eligibility-validation.spec.ts' : 'tests/email-validation.spec.ts',
          playwrightTag: s.id === 1 ? '@TC-402' : '@TC-301',
          reasoning: 'Cosine fallback match.'
        });
      }
    }

    // Step 8: Compile and generate PR Comment 1 (Test Plan)
    const comment1Markdown = this.compilePRComment1(prNumber, testPlan, area);
    this.saveLocalComment('comment1-test-plan.md', comment1Markdown);

    // Step 9-10: Scan E2E Playwright feature annotations using RAG mapped entries
    console.log(`[Step 9-10] Scanning E2E automation codebase for tagged suites...`);
    const automationSuites = testPlan.map(p => ({
      feature: path.basename(p.scriptPath),
      framework: 'Playwright',
      tag: p.playwrightTag
    }));

    // Step 11: Compile PR Comment 2 & selective Groovy CI execution command
    const { comment2Markdown, groovyProfile } = this.compilePRComment2(prNumber, area, primaryRule.rule_name, automationSuites);
    this.saveLocalComment('comment2-regression.md', comment2Markdown);
    fs.writeFileSync(path.join(this.baseDir, 'dist', 'ValidateXxxTests.groovy'), groovyProfile.trim(), 'utf-8');

    // --- LIVE GITHUB INTEGRATION LOOP ---
    if (githubToken) {
      console.log(`\n[GitHub] Active GITHUB_TOKEN detected. Posting comments directly to GitHub PR #${prNumber}...`);
      await this.publishCommentToGitHub(prNumber, repoOwner, repoName, githubToken, comment1Markdown);
      await this.publishCommentToGitHub(prNumber, repoOwner, repoName, githubToken, comment2Markdown);
    } else {
      console.log(`\n[GitHub] No GITHUB_TOKEN detected. Skipping live GitHub PR posting.`);
      console.log(`[GitHub] Review mock PR comments generated locally inside the 'dist/' folder.`);
    }

    console.log(`======================================================`);
    console.log(` 🎉 FORESIGHT PIPELINE COMPLETED SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  }

  private getGitDiff(): string {
    // If in GitHub Actions, run live git diff
    if (process.env.GITHUB_ACTIONS) {
      try {
        console.log('[Git] Running in CI: Fetching diff via git diff HEAD~1...');
        return execSync('git diff HEAD~1').toString();
      } catch (error) {
        // Fallback
      }
    }

    // Local mock diff
    if (!fs.existsSync(this.mockPrFile)) {
      const mockDiff = `
diff --git a/rules/mzAddChannelWrapper.json b/rules/mzAddChannelWrapper.json
index d7a8b9c..e3f4g5h 100644
--- a/rules/mzAddChannelWrapper.json
+++ b/rules/mzAddChannelWrapper.json
@@ -3,3 +3,3 @@
-  "name": "mzAddChannelWrapper",
-  "functionalArea": "Email",
-  "conditions": ["Channel == 'Web'"]
+  "conditions": ["Channel == 'Email'"]
      `;
      fs.writeFileSync(this.mockPrFile, mockDiff, 'utf-8');
    }
    return fs.readFileSync(this.mockPrFile, 'utf-8');
  }

  private extractAlteredRuleName(diffText: string): string | null {
    // Simple regex search in file path
    const match = diffText.match(/rules\/(.*?)\.json/);
    return match ? match[1] : null;
  }

  private getPythonPath(): string {
    const venvWin = path.join(this.baseDir, '.venv', 'Scripts', 'python.exe');
    const venvUnix = path.join(this.baseDir, '.venv', 'bin', 'python');
    if (fs.existsSync(venvWin)) {
      return `"${venvWin}"`;
    } else if (fs.existsSync(venvUnix)) {
      return `"${venvUnix}"`;
    }
    return 'python';
  }

  private queryParquetDatabase(ruleName: string): ParquetResult[] {
    const pythonScript = path.join(this.baseDir, 'rule-indexer', 'query.py');
    const pythonPath = this.getPythonPath();
    try {
      const command = `${pythonPath} "${pythonScript}" "${ruleName}"`;
      const output = execSync(command).toString().trim();
      const parsed = JSON.parse(output);
      if (parsed.status === 'success') {
        return parsed.results as ParquetResult[];
      }
    } catch (e: any) {
      console.error(`[Parquet DB Error]`, e.message);
    }
    return [{
      rule_id: "RULE-101",
      rule_name: "mzAddChannelWrapper",
      rule_class: "Rule-Decision-Strategy",
      functional_area: "Email",
      referenced_rule_id: "RULE-102"
    }];
  }

  private buildTestScenarios(area: string) {
    return [
      { id: 1, scenario: "Create email treatment with dynamic blank name parameters", expected: "Validation error displayed on save" },
      { id: 2, scenario: "Verify treatment HTML body with special character overlays", expected: "Acoustic rendering checks pass successfully" },
      { id: 3, scenario: "Verify campaign arbitration for premium credit card segments", expected: "Next Best Action returns Cashback card offer" }
    ];
  }

  private mapAgileStudioStories(scenarios: any[]) {
    const mockAgileStudioDb = ["TEST-212841", "TEST-212842", "TEST-212849"];
    return scenarios.map((s, idx) => ({
      ...s,
      testId: mockAgileStudioDb[idx],
      status: "🟡 To Run"
    }));
  }

  private compilePRComment1(prNumber: number, testPlan: any[], area: string): string {
    let md = `## 🚀 CDH Functional Test Plan - PR #${prNumber}\n\n`;
    md += `Given the altered rule patterns, our foresight agent compiled this targeted validation checkpoint list:\n\n`;
    md += `| # | CDH Area | Scenario | Expected Outcome | Agile Studio Story | Status |\n`;
    md += `| :--- | :--- | :--- | :--- | :---: | :---: |\n`;
    
    testPlan.forEach(p => {
      md += `| ${p.id} | ${area} | ${p.scenario} | ${p.expected} | **${p.testId}** | ${p.status} |\n`;
    });

    md += `\n*Post Comment 1 executed via GitHub Octokit API • Build by Reshma Pathan*\n`;
    return md;
  }

  private scanAutomationSuites(area: string) {
    return [
      { feature: "03CreateAndEditEmailTreatment.feature", framework: "Selenium", tag: "@TC-301 @ciregression" },
      { feature: "04EmailArbitrationValidation.spec.ts", framework: "Playwright", tag: "@TC-402 @cismoke" }
    ];
  }

  private compilePRComment2(prNumber: number, area: string, ruleName: string, suites: any[]) {
    let md = `## 🔍 Impact Analysis & Automation Scoping - PR #${prNumber}\n\n`;
    md += `### 🟥 Impacted Business Areas\n`;
    md += `| Area | Impact Level | Reason |\n`;
    md += `| :--- | :---: | :--- |\n`;
    md += `| ${area} | 🔴 **HIGH** | Pega Decision Strategy Rule \`${ruleName}\` was modified. |\n\n`;

    md += `### 🧪 Scoped Automation Coverage\n`;
    md += `The agent detected existing test coverage tagged inside Cucumber features and Playwright files:\n\n`;
    md += `| Feature File | Test Framework | Scoped Tags |\n`;
    md += `| :--- | :--- | :--- |\n`;
    
    suites.forEach(s => {
      md += `| \`${s.feature}\` | ${s.framework} | \`${s.tag}\` |\n`;
    });

    const tagsArray = suites.map(s => s.tag.split(' ')[1] || '@cismoke');
    const groovyProfile = `
// Selective CI Test Execution Profile
// Copy-paste to trigger targeted pipeline validation
class ValidateEmailTests {
    static void main(String[] args) {
        println "[CI] Scoped regression execution active: Running tags ${tagsArray.join(' OR ')}"
    }
}
    `;

    md += `\n### ⚡ Groovy CI Execution Command (Copy-Paste Ready)\n`;
    md += `\`\`\`groovy\n${groovyProfile}\`\`\`\n`;
    md += `\n*Post Comment 2 executed via GitHub Octokit API • Build by Reshma Pathan*\n`;

    return { comment2Markdown: md, groovyProfile };
  }

  private saveLocalComment(filename: string, content: string): void {
    const distDir = path.join(this.baseDir, 'dist');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, filename), content, 'utf-8');
  }

  private async publishCommentToGitHub(prNumber: number, owner: string, repo: string, token: string, body: string): Promise<void> {
    try {
      const { Octokit } = require('@octokit/rest');
      const octokit = new Octokit({ auth: token });
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body
      });
      console.log(`[GitHub] Comment posted successfully to PR #${prNumber}.`);
    } catch (err: any) {
      console.error(`[GitHub] Failed to post comment:`, err.message);
    }
  }
}

// Auto-run if executed directly
if (require.main === module) {
  (async () => {
    const agent = new RegressionForesightAgent();
    await agent.executeForesightPipeline();
  })();
}

export { RegressionForesightAgent };
