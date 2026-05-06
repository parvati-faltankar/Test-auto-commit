# Integration Examples

Production-ready examples for integrating the Git Agent with your application.

## Example 1: Basic CLI Usage

```bash
cd server/git-agent

# Install dependencies
npm install

# Configure
npm run cli config

# Run workflow
npm run cli workflow

# Check status
npm run cli status

# Resolve conflicts
npm run cli resolve-conflicts
```

## Example 2: Express API Integration

Create `server/routes/git-agent.ts`:

```typescript
import express, { Request, Response } from 'express';
import { GitAgentIntegration } from '../git-agent/src/index';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();
const gitAgent = new GitAgentIntegration();

// Initialize on startup
gitAgent.initialize({
  repoPath: process.cwd(),
  baseBranch: process.env.GIT_BASE_BRANCH || 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: process.env.DRY_RUN === 'true',
  verbose: true,
});

/**
 * GET /api/git/status
 * Get repository status
 */
router.get('/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await gitAgent.getStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/git/workflow
 * Execute full workflow
 */
router.post('/workflow', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await gitAgent.executeWorkflow();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/git/commit
 * Create commit with optional custom message
 */
router.post('/commit', verifyToken, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const result = await gitAgent.commit(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/git/pull
 * Pull from parent branch
 */
router.post('/pull', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await gitAgent.pullFromParent();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/git/push
 * Push to remote
 */
router.post('/push', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await gitAgent.push();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/git/conflicts
 * Check for merge conflicts
 */
router.get('/conflicts', verifyToken, async (req: Request, res: Response) => {
  try {
    const result = await gitAgent.checkForConflicts();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/git/stage
 * Stage changes
 */
router.post('/stage', verifyToken, async (req: Request, res: Response) => {
  try {
    const { files } = req.body;
    const result = await gitAgent.stageChanges(files);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
```

## Example 3: Chat Agent Integration

Update `server/agent.js`:

```javascript
import { GitAgentIntegration } from './git-agent/src/index';

class ChatAgent {
  constructor() {
    this.gitAgent = new GitAgentIntegration();
    this.gitAgent.initialize({
      repoPath: process.cwd(),
      baseBranch: process.env.GIT_BASE_BRANCH || 'main',
      openaiApiKey: process.env.OPENAI_API_KEY,
      dryRun: process.env.DRY_RUN === 'true',
      verbose: true,
    });
  }

  async processInput(userInput, context = {}) {
    // Check if user wants to use git features
    const gitKeywords = ['git', 'commit', 'pull', 'push', 'branch', 'conflict'];
    const wantsGit = gitKeywords.some((keyword) =>
      userInput.toLowerCase().includes(keyword),
    );

    if (wantsGit) {
      return await this.handleGitCommand(userInput, context);
    }

    // Default chat response
    return await this.generateChatResponse(userInput);
  }

  async handleGitCommand(userInput, context) {
    const input = userInput.toLowerCase();

    // Parse intent
    if (input.includes('status') || input.includes('repo')) {
      return await this.gitAgent.getStatus();
    }

    if (input.includes('commit') || input.includes('save')) {
      const customMessage = this.extractCommitMessage(userInput);
      return await this.gitAgent.commit(customMessage);
    }

    if (input.includes('pull') || input.includes('fetch')) {
      return await this.gitAgent.pullFromParent();
    }

    if (input.includes('push')) {
      return await this.gitAgent.push();
    }

    if (input.includes('conflict')) {
      return await this.gitAgent.checkForConflicts();
    }

    if (
      input.includes('workflow') ||
      input.includes('all') ||
      input.includes('full')
    ) {
      return await this.gitAgent.executeWorkflow();
    }

    if (input.includes('stage') || input.includes('add')) {
      return await this.gitAgent.stageChanges();
    }

    // Default git response
    return {
      success: false,
      message: 'Git command not recognized. Try: status, commit, pull, push, workflow',
    };
  }

  extractCommitMessage(userInput) {
    // Extract custom message from input like "commit: fix bug"
    const match = userInput.match(/commit:?\s*(.+)/i);
    return match ? match[1].trim() : undefined;
  }

  async generateChatResponse(userInput) {
    // Regular chat processing
    return {
      role: 'assistant',
      content: 'How can I help you?',
    };
  }
}

export default new ChatAgent();
```

## Example 4: React Component Integration

Create `src/pages/GitAssistant.tsx`:

```typescript
import React, { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export function GitAssistant() {
  const [selectedAgent, setSelectedAgent] = useState<'chat' | 'git'>('chat');
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  const handleGitCommand = async (command: string) => {
    try {
      const response = await fetch('/api/git/' + command, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      console.log('Git result:', result);
      return result;
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: String(error) };
    }
  };

  return (
    <div className="git-assistant">
      <div className="agent-selector">
        <button
          onClick={() => setSelectedAgent('chat')}
          className={selectedAgent === 'chat' ? 'active' : ''}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setSelectedAgent('git')}
          className={selectedAgent === 'git' ? 'active' : ''}
        >
          🤖 Git Agent
        </button>
      </div>

      {selectedAgent === 'git' && (
        <div className="git-commands">
          <button onClick={() => handleGitCommand('status')}>
            📊 Status
          </button>
          <button onClick={() => handleGitCommand('workflow')}>
            🔄 Workflow
          </button>
          <button onClick={() => handleGitCommand('commit')}>
            💾 Commit
          </button>
          <button onClick={() => handleGitCommand('pull')}>
            📥 Pull
          </button>
          <button onClick={() => handleGitCommand('push')}>
            📤 Push
          </button>
          <button onClick={() => handleGitCommand('conflicts')}>
            ⚠️ Conflicts
          </button>
        </div>
      )}

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a command..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Example 5: Webhook Integration

Create `server/webhooks/git-agent.ts`:

```typescript
import express from 'express';
import { GitAgentIntegration } from '../git-agent/src/index';

const router = express.Router();
const gitAgent = new GitAgentIntegration();

/**
 * Webhook: Auto-commit on schedule (e.g., Vercel Cron)
 */
router.post('/auto-commit', async (req, res) => {
  const secret = req.headers['x-secret'];
  if (secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await gitAgent.commit('Scheduled auto-commit');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Webhook: Pull on push notification
 */
router.post('/on-push', async (req, res) => {
  try {
    const result = await gitAgent.pullFromParent();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
```

## Example 6: Scheduled Tasks

Create `server/tasks/git-agent-tasks.ts`:

```typescript
import cron from 'node-cron';
import { GitAgentIntegration } from '../git-agent/src/index';

const gitAgent = new GitAgentIntegration();

// Schedule tasks
export function setupGitAgentTasks() {
  // Run workflow every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled workflow...');
    try {
      const result = await gitAgent.executeWorkflow();
      console.log('Workflow result:', result);
    } catch (error) {
      console.error('Workflow error:', error);
    }
  });

  // Check for conflicts every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Checking for conflicts...');
    try {
      const result = await gitAgent.checkForConflicts();
      if (result.data?.hasConflicts) {
        console.warn('Conflicts detected:', result.data.conflictFiles);
        // Send notification
      }
    } catch (error) {
      console.error('Conflict check error:', error);
    }
  });

  // Daily status report
  cron.schedule('0 9 * * *', async () => {
    console.log('Generating daily status report...');
    try {
      const result = await gitAgent.getStatus();
      console.log('Daily status:', result.data);
      // Send report email
    } catch (error) {
      console.error('Status report error:', error);
    }
  });
}
```

## Example 7: Error Handling with Notifications

```typescript
import nodemailer from 'nodemailer';
import { GitAgentIntegration } from '../git-agent/src/index';

const gitAgent = new GitAgentIntegration();

async function executeWithNotifications() {
  try {
    const result = await gitAgent.executeWorkflow();

    if (!result.success) {
      // Send error notification
      await sendNotification({
        subject: 'Git Agent Error',
        body: `Error: ${result.error}`,
        type: 'error',
      });

      if (result.rollbackAvailable) {
        console.log('Rollback was performed');
      }
    } else {
      // Send success notification
      await sendNotification({
        subject: 'Git Agent Success',
        body: `Workflow completed. Commit: ${result.data?.commitHash}`,
        type: 'success',
      });
    }
  } catch (error) {
    await sendNotification({
      subject: 'Git Agent Critical Error',
      body: `Critical error: ${error}`,
      type: 'critical',
    });
  }
}

async function sendNotification(notification) {
  const transporter = nodemailer.createTransport({
    // Configure your email service
  });

  await transporter.sendMail({
    from: 'noreply@example.com',
    to: process.env.ADMIN_EMAIL,
    subject: notification.subject,
    text: notification.body,
  });
}
```

## Example 8: Monitoring & Metrics

```typescript
import { GitAgentIntegration } from '../git-agent/src/index';

class GitAgentMonitoring {
  private metrics = {
    totalWorkflows: 0,
    successfulWorkflows: 0,
    failedWorkflows: 0,
    averageExecutionTime: 0,
    lastExecution: null as Date | null,
  };

  async executeWithMetrics() {
    const startTime = Date.now();
    this.metrics.totalWorkflows++;

    try {
      const gitAgent = new GitAgentIntegration();
      const result = await gitAgent.executeWorkflow();

      if (result.success) {
        this.metrics.successfulWorkflows++;
      } else {
        this.metrics.failedWorkflows++;
      }

      const duration = Date.now() - startTime;
      this.updateAverageTime(duration);
      this.metrics.lastExecution = new Date();

      return result;
    } catch (error) {
      this.metrics.failedWorkflows++;
      throw error;
    }
  }

  private updateAverageTime(duration: number) {
    const totalTime =
      this.metrics.averageExecutionTime * (this.metrics.totalWorkflows - 1);
    this.metrics.averageExecutionTime =
      (totalTime + duration) / this.metrics.totalWorkflows;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (
        (this.metrics.successfulWorkflows / this.metrics.totalWorkflows) *
        100
      ).toFixed(2) + '%',
    };
  }
}

const monitoring = new GitAgentMonitoring();
```

## Example 9: Configuration Management

Create `server/config/git-agent-config.ts`:

```typescript
import { AgentConfig } from '../git-agent/src/types';

export const gitAgentConfig: AgentConfig = {
  repoPath: process.env.GIT_REPO_PATH || process.cwd(),
  baseBranch: process.env.GIT_BASE_BRANCH || 'main',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  dryRun: process.env.DRY_RUN === 'true',
  verbose: process.env.NODE_ENV !== 'production',
  autoResolveStrategy:
    (process.env.AUTO_RESOLVE_STRATEGY as any) || 'keep-current',
};

// Validation
export function validateConfig(): boolean {
  if (!gitAgentConfig.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  return true;
}
```

## Example 10: Testing

Create `server/git-agent/__tests__/git-agent.test.ts`:

```typescript
import { GitAgent } from '../src/services/git-agent';
import Logger from '../src/utils/logger';

describe('GitAgent', () => {
  let agent: GitAgent;
  const config = {
    repoPath: process.cwd(),
    baseBranch: 'main',
    openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
    dryRun: true, // Always dry-run in tests
    verbose: true,
  };

  beforeAll(() => {
    agent = new GitAgent(config, new Logger());
  });

  test('should validate config', async () => {
    const isValid = await agent.validateConfig();
    expect(isValid).toBe(true);
  });

  test('should get repository status', async () => {
    const status = await agent.getStatus();
    expect(status).toHaveProperty('branch');
    expect(status).toHaveProperty('status');
  });

  test('should execute workflow in dry-run mode', async () => {
    const result = await agent.executeFullWorkflow();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
  });
});
```

---

For more information, see:
- [README.md](./README.md) - Feature overview
- [SETUP.md](./SETUP.md) - Installation and configuration
- [API.md](./API.md) - Complete API reference
