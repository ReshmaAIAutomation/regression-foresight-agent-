import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface JiraTestCase {
  id: string;
  title: string;
  description: string;
  expectedResult: string;
  status: string;
}

export class JiraClient {
  private domain: string = '';
  private email: string = '';
  private token: string = '';
  private envPath: string = '';
  private offlineMode: boolean = false;

  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.loadCredentials();
  }

  /**
   * Loads credentials dynamically from local .env
   */
  private loadCredentials() {
    if (fs.existsSync(this.envPath)) {
      const dotenv = require('dotenv');
      dotenv.config();
    }
    this.domain = process.env.JIRA_DOMAIN || '';
    this.email = process.env.JIRA_EMAIL || '';
    this.token = process.env.JIRA_API_TOKEN || '';
    this.offlineMode = process.env.OFFLINE_MODE === 'true';
  }

  /**
   * Primary Path: Direct, Headless REST API Call to Jira Cloud
   */
  public async fetchTestCasesFromJira(storyId: string): Promise<JiraTestCase[]> {
    this.loadCredentials(); // Reload in case token refreshed

    if (this.offlineMode) {
      console.log(`[Jira] Offline Mode active. Loading local fallback test database...`);
      return this.getLocalMockTestCases(storyId);
    }

    if (!this.token || !this.email || !this.domain) {
      console.warn(`\n[Jira] Missing credentials in .env. Triggering headed browser setup fallback...`);
      return await this.triggerHeadedFallbackAndRetry(storyId);
    }

    const cleanedDomain = this.domain.replace(/\/$/, '');
    // Standard Atlassian Jira Cloud REST API v3 endpoint for fetching issues/subtasks
    const url = `${cleanedDomain}/rest/api/3/issue/${storyId}`;
    
    // Base64 encode the Atlassian Basic Authentication credentials (Email + API Token)
    const authBuffer = Buffer.from(`${this.email}:${this.token}`).toString('base64');

    console.log(`[Jira API] Attempting direct REST API call: GET /issue/${storyId}...`);

    try {
      // Standard Node-fetch or global fetch (Node 18+)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authBuffer}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 401 || response.status === 403) {
        console.warn(`\n[Jira API Error] Auth failed (Status ${response.status}). Token expired or invalid.`);
        console.warn(`[Jira] Launching headed Playwright automation as fallback to refresh credentials...`);
        return await this.triggerHeadedFallbackAndRetry(storyId);
      }

      if (response.status === 404) {
        console.warn(`[Jira API] Issue "${storyId}" not found (404).`);
        if (storyId !== 'KAN-1') {
          console.log(`[Jira API] Retrying with demo story "KAN-1"...`);
          return await this.fetchTestCasesFromJira('KAN-1');
        }
      }

      if (!response.ok) {
        throw new Error(`Jira API returned HTTP Status ${response.status}`);
      }

      const data: any = await response.json();
      console.log(`[Jira API] Successfully fetched issue details via headless REST API.`);
      
      // Parse JIRA subtasks or custom test case fields (standard schema mapping)
      const subtasks = data.fields?.subtasks || [];
      const testCases: JiraTestCase[] = subtasks.map((task: any, idx: number) => ({
        id: task.key,
        title: task.fields?.summary || `Manual Test Case Checkpoint ${idx + 1}`,
        description: task.fields?.description || 'Verify functional workflow parameters.',
        expectedResult: 'Functional expectations verified successfully.',
        status: '🟡 To Run'
      }));

      // If no subtasks, return a default mock case representing the parent story issue
      if (testCases.length === 0) {
        testCases.push({
          id: `${storyId}-TC01`,
          title: data.fields?.summary || 'Functional Verification',
          description: data.fields?.description || 'Validate core strategy rule modifications.',
          expectedResult: 'Foresight automated check pass.',
          status: '🟡 To Run'
        });
      }

      return testCases;

    } catch (error: any) {
      console.error(`[Jira API Error] direct request failed:`, error.message);
      if (error.message.includes('Status 404')) {
        console.warn(`[Jira] Issue not found on Jira. Falling back to local offline mock database...`);
        return this.getLocalMockTestCases(storyId);
      }
      console.warn(`[Jira] Reverting to headed Playwright browser authentication...`);
      return await this.triggerHeadedFallbackAndRetry(storyId);
    }
  }

  /**
   * Secondary Fallback Path: Launches headed Playwright browser to refresh token
   */
  private async triggerHeadedFallbackAndRetry(storyId: string): Promise<JiraTestCase[]> {
    const automationScript = path.join(process.cwd(), 'rule-indexer', 'setup_jira_automation.js');
    
    if (!fs.existsSync(automationScript)) {
      console.error(`[Jira Fallback Error] Playwright automation setup file not found.`);
      return this.getLocalMockTestCases(storyId);
    }

    try {
      console.log(`[Playwright] Spawning headed Chromium login wrapper: node setup_jira_automation.js...`);
      // Executed synchronously so the pipeline blocks until the user logs in and the token is saved!
      execSync(`node "${automationScript}"`, { stdio: 'inherit' });
      
      console.log(`[Jira] Token refreshed inside .env! Retrying primary REST API call...`);
      return await this.fetchTestCasesFromJira(storyId);

    } catch (err: any) {
      console.error(`[Jira Fallback Error] Playwright headed setup failed:`, err.message);
      console.log(`[Jira] Falling back to local offline mock database...`);
      return this.getLocalMockTestCases(storyId);
    }
  }

  /**
   * Offline Fallback Database (If both API and Browser authentication are skipped)
   */
  private getLocalMockTestCases(storyId: string): JiraTestCase[] {
    console.log(`[Jira] Serving local mock JIRA test case dataset for story: ${storyId}`);
    return [
      {
        id: "TEST-212841",
        title: "Verify treatment HTML body with special character overlays",
        description: "Standard campaign validation checks.",
        expectedResult: "Acoustic rendering checks pass successfully.",
        status: "🟡 To Run"
      },
      {
        id: "TEST-212842",
        title: "Create email treatment with dynamic blank name parameters",
        description: "Null parameter checks.",
        expectedResult: "Validation error displayed on save.",
        status: "🟡 To Run"
      }
    ];
  }
}
