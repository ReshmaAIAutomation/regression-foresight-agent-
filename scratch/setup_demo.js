const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load environment variables from .env
const dotenv = require('dotenv');
dotenv.config();

const jiraDomain = process.env.JIRA_DOMAIN || '';
const jiraEmail = process.env.JIRA_EMAIL || '';
const jiraToken = process.env.JIRA_API_TOKEN || '';
const githubToken = process.env.GITHUB_TOKEN || '';

if (!jiraDomain || !jiraEmail || !jiraToken || !githubToken) {
  console.error('Error: Missing required tokens in .env file.');
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');

async function createJiraStoryAndSubtasks() {
  console.log('\n=============================================================');
  console.log(' 🚀 STEP 1: CREATING REAL JIRA STORY & SUBTASKS...');
  console.log('=============================================================');

  // 1. Create Parent Story
  const storyPayload = {
    fields: {
      project: { key: 'KAN' },
      summary: 'Implement Eligibility Rule Updates for Cashback Campaign',
      issuetype: { name: 'Story' },
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Validate CashbackEligibility rule modifications and dependencies.' }]
          }
        ]
      }
    }
  };

  const response = await fetch(`${jiraDomain.replace(/\/$/, '')}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(storyPayload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Jira Story: ${response.status} - ${errText}`);
  }

  const storyData = await response.json();
  const storyKey = storyData.key;
  console.log(`✅ Jira Story created successfully: ${storyKey}`);

  // 2. Create Subtasks
  const subtasks = [
    'Verify email treatment HTML body with special character overlays',
    'Verify credit score threshold cashback eligibility limits'
  ];

  for (const summary of subtasks) {
    const subtaskPayload = {
      fields: {
        project: { key: 'KAN' },
        parent: { key: storyKey },
        summary: summary,
        issuetype: { name: 'Sub-task' }
      }
    };

    const subtaskRes = await fetch(`${jiraDomain.replace(/\/$/, '')}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(subtaskPayload)
    });

    if (!subtaskRes.ok) {
      console.error(`Warning: Failed to create subtask "${summary}": ${subtaskRes.status}`);
    } else {
      const subtaskData = await subtaskRes.json();
      console.log(`   --> Created subtask: ${subtaskData.key} | ${summary}`);
    }
  }

  return storyKey;
}

async function createGitHubPR() {
  console.log('\n=============================================================');
  console.log(' 🚀 STEP 2: INITIALIZING GIT, PUSHING & CREATING REAL PR...');
  console.log('=============================================================');

  const repoOwner = 'ReshmaAIAutomation';
  const repoName = 'regression-foresight-agent-';

  // 1. Git push main
  console.log('[Git] Staging and pushing main branch...');
  execSync('git add .');
  try {
    execSync('git commit -m "feat: initial commit of main codebase"');
  } catch (e) {
    // If nothing to commit, continue
  }
  execSync('git push -u origin main --force');
  console.log('✅ Successfully pushed main branch to GitHub.');

  // 2. Create new branch for PR
  console.log('[Git] Creating new branch: feat/eligibility-rule-change...');
  try {
    execSync('git branch -D feat/eligibility-rule-change');
  } catch (e) {}
  execSync('git checkout -b feat/eligibility-rule-change');

  // 3. Edit rule file
  const rulePath = path.join(__dirname, '..', 'mock-rules', 'CashbackEligibility.json');
  const ruleContent = JSON.parse(fs.readFileSync(rulePath, 'utf-8'));
  ruleContent.conditions = ["Age > 25", "CreditScore > 750"];
  fs.writeFileSync(rulePath, JSON.stringify(ruleContent, null, 2), 'utf-8');
  console.log('✅ Modified mock-rules/CashbackEligibility.json locally.');

  // 4. Commit and push branch
  execSync('git add mock-rules/CashbackEligibility.json');
  execSync('git commit -m "feat: restrict cashback criteria score and age threshold"');
  execSync('git push -u origin feat/eligibility-rule-change --force');
  console.log('✅ Successfully pushed branch to GitHub.');

  // 5. Create Pull Request via GitHub API
  console.log('[GitHub] Creating Pull Request...');
  const prPayload = {
    title: 'feat: restrict cashback eligibility requirements',
    head: 'feat/eligibility-rule-change',
    base: 'main',
    body: 'This PR restricts the age and credit score criteria for campaign arbitration. Closes out the cashback strategy requirements.'
  };

  const prRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/pulls`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${githubToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'node'
    },
    body: JSON.stringify(prPayload)
  });

  if (!prRes.ok) {
    const errText = await prRes.text();
    throw new Error(`Failed to create Pull Request: ${prRes.status} - ${errText}`);
  }

  const prData = await prRes.json();
  console.log(`✅ GitHub Pull Request created successfully!`);
  console.log(`   --> PR Number: ${prData.number}`);
  console.log(`   --> URL: ${prData.html_url}`);

  // Switch back to main branch locally to be clean
  execSync('git checkout main');

  return prData.number;
}

async function run() {
  try {
    const storyKey = await createJiraStoryAndSubtasks();
    const prNumber = await createGitHubPR();

    console.log('\n=============================================================');
    console.log(' 🚀 STEP 3: UPDATING CONFIGURATIONS AND ENVIRONMENT...');
    console.log('=============================================================');

    // 1. Update agent.ts with the new story key and PR number
    const agentPath = path.join(__dirname, '..', 'src', 'agent.ts');
    let agentCode = fs.readFileSync(agentPath, 'utf-8');
    
    // Replace STORY- or PROJ-101 defaults
    agentCode = agentCode.replace(
      /const prNumber = process\.env\.PR_NUMBER \? parseInt\(process\.env\.PR_NUMBER\) : \d+;/,
      `const prNumber = process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER) : ${prNumber};`
    );
    agentCode = agentCode.replace(
      /const linkedStoryId = process\.env\.PR_NUMBER \? `STORY-\${process\.env\.PR_NUMBER}` : '.*';/,
      `const linkedStoryId = process.env.PR_NUMBER ? \`STORY-\${process.env.PR_NUMBER}\` : '${storyKey}';`
    );
    
    fs.writeFileSync(agentPath, agentCode, 'utf-8');
    console.log('✅ Updated src/agent.ts with new Story Key and PR Number.');

    // Rebuild TypeScript project
    console.log('[Build] Rebuilding TypeScript codebase...');
    execSync('npm run build');

    console.log('\n=============================================================');
    console.log(' 🎉 AUTOMATED SETUP COMPLETED SUCCESSFULLY! 🎉');
    console.log(` 1. Real JIRA Story: ${storyKey}`);
    console.log(` 2. Real GitHub PR: #${prNumber}`);
    console.log('=============================================================');
    console.log('You can now run: npm run run-agent');
    console.log('=============================================================\n');

  } catch (error) {
    console.error('Fatal Setup Error:', error.message);
  }
}

run();
