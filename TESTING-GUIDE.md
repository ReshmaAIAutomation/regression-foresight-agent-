# 🧪 ScopePilot / Regression Foresight Agent: Testing & PR Ingestion Guide

Reshma, this guide explains exactly **how the agent fetches (gets) Pull Request details** in production compared to local testing, and outlines how you can execute and verify **2 distinct PR scenarios** locally before pushing any code to GitHub.

---

## 🔍 How Does the Agent "Get" the PR?

In a live pipeline, the agent does not guess. It fetches real code differences dynamically from GitHub using two channels: **GitHub Action Events** and the **Octokit API**.

### Channel A: Live in CI/CD (GitHub Actions)
1. **The Event Trigger:** When a developer pushes commits and opens a PR on your repository, GitHub automatically triggers a `pull_request` event and runs the workflow file [foresight-agent.yml](file:///C:/Users/lenovo/Downloads/RegressionForesightAgent/.github/workflows/foresight-agent.yml).
2. **Context Injection:** GitHub automatically sets environment variables for the runner:
   - `PR_NUMBER` (The number of the active PR, e.g., `12`)
   - `REPO_OWNER` (Your GitHub username)
   - `REPO_NAME` (Your repository name, `regression-foresight-agent`)
   - `GITHUB_TOKEN` (A secure, temporary authentication token created by GitHub for the active build)
3. **Diff Fetching via API:** 
   The TypeScript orchestrator initializes **Octokit** (`@octokit/rest`), which is GitHub's official REST API client, and makes a secure HTTPS call to get the PR's raw diff content:
   ```typescript
   const octokit = new Octokit({ auth: token });
   const response = await octokit.pulls.get({
     owner: repoOwner,
     repo: repoName,
     pull_number: prNumber,
     mediaType: { format: 'diff' } // Directs GitHub to return the raw git diff text
   });
   const diffText = response.data; // Raw git diff is now in memory!
   ```

### Channel B: Running Locally (For Testing)
To let you test, debug, and demo the agent completely offline without making live API calls, we use **Mock PR Diff Files** representing changed files in a branch.
- The orchestrator checks if a local diff file (like `mock-pr-diff.txt`) is present.
- If it is, it parses it as if it was fetched from the GitHub API!

---

## 🧪 Testing the 2 Local PR Scenarios

We have pre-staged **2 distinct PR Scenarios** in your project folder so you can test the entire pipeline locally.

### 📋 Scenario 1: Email Channel Strategy Rule Change
* **The Code Change:** A developer changes the channel condition of the email strategy rule `mzAddChannelWrapper.json` from `Web` to `Email`.
* **Impacted Domain:** `Email` validation.
* **Test tags scoped:** `@TC-301 @ciregression`.
* **How to run:**
  1. Open [agent.ts](file:///C:/Users/lenovo/Downloads/RegressionForesightAgent/src/agent.ts) and verify that `this.mockPrFile` points to `mock-pr-diff.txt` (this is the default).
  2. Run the agent in your terminal:
     ```bash
     npm run run-agent
     ```
  3. **Verify the Output:**
     - Open [comment1-test-plan.md](file:///C:/Users/lenovo/Downloads/RegressionForesightAgent/dist/comment1-test-plan.md) inside the `dist/` folder. It will contain the functional test plan for the **Email** area mapping to **TEST-212841**.
     - Open [comment2-regression.md](file:///C:/Users/lenovo/Downloads/RegressionForesightAgent/dist/comment2-regression.md). It will contain the scoped automation table listing `03CreateAndEditEmailTreatment.feature` and the targeted Groovy CI command.

---

### 📋 Scenario 2: Campaign Eligibility Rule Change
* **The Code Change:** A developer changes the credit score criteria in the strategy rule `CashbackEligibility.json` from `720` to `750`.
* **Impacted Domain:** `Eligibility` validation.
* **Test tags scoped:** `@TC-402 @cismoke`.
* **How to run:**
  1. Copy the contents of the eligibility diff or rename `mock-pr-diff-eligibility.txt` to `mock-pr-diff.txt` inside your folder:
     ```bash
     cp mock-pr-diff-eligibility.txt mock-pr-diff.txt
     ```
  2. Compile your Parquet metadata index (reflecting the changed rules):
     ```bash
     python rule-indexer/rules_indexer.py
     ```
  3. Execute the agent:
     ```bash
     npm run run-agent
     ```
  4. **Verify the Output:**
     - Open the generated comments in the `dist/` folder. You will observe that the agent has dynamically updated the functional mapping to **Eligibility**, and target test cases map to **TEST-212842**.
     - The scoped regression table has automatically updated to only run Playwright tests tagged with **`@cismoke`**!

---

## 📝 Guide to Publishing to GitHub (Move Changes)

Once you are satisfied with local runs, run these commands to push the project live to your public repository:

```bash
git init
git add .
git commit -m "feat: initial release of Regression Foresight Agent with GitHub Actions automation"
git branch -M main
git remote add origin https://github.com/ReshmaAIAutomation/regression-foresight-agent.git
git push -u origin main
```
