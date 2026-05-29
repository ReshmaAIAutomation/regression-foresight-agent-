const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.GITHUB_TOKEN;
const owner = 'ReshmaAIAutomation';
const repo = 'regression-foresight-agent-';
const prNumber = 1;

if (!token) {
  console.error('Error: GITHUB_TOKEN is missing in .env file.');
  process.exit(1);
}

const octokit = new Octokit({ auth: token });

async function cleanupOldComments() {
  console.log('\n=============================================================');
  console.log(' 🧹 CLEANING UP OLD GITHUB COMMENTS...');
  console.log('=============================================================');

  try {
    // 1. Fetch all comments on the Pull Request (Issues API covers PR comments)
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    console.log(`Found ${comments.length} total comments on PR #${prNumber}.`);

    // Filter comments created by the agent (containing 'Build by Reshma Pathan')
    const agentComments = comments.filter(c => c.body && c.body.includes('Build by Reshma Pathan'));
    console.log(`Found ${agentComments.length} agent-generated comments.`);

    if (agentComments.length <= 1) {
      console.log('Only 1 or fewer agent comments exist. No cleanup needed.');
      return;
    }

    // Sort by creation time ascending so the oldest are first
    agentComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Keep only the single latest master comment
    const commentsToDelete = agentComments.slice(0, agentComments.length - 1);
    console.log(`Deleting ${commentsToDelete.length} outdated comments, keeping the single latest...`);

    for (const comment of commentsToDelete) {
      console.log(`   --> Deleting comment ID: ${comment.id} (Posted: ${comment.created_at})`);
      await octokit.issues.deleteComment({
        owner,
        repo,
        comment_id: comment.id
      });
    }

    console.log('✅ Outdated comments deleted successfully! Only the single latest dashboard is kept.');

  } catch (err) {
    console.error('Error during comments cleanup:', err.message);
  }
}

cleanupOldComments();
