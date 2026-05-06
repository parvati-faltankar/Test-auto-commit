# 🚀 Setup & Integration Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd server/git-agent
npm install
```

### 2. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your OpenAI API key
# OPENAI_API_KEY=sk_your_key_here
```

### 3. Build

```bash
npm run build
```

### 4. Run CLI (Test)

```bash
npm run cli workflow
```

## Integration with Your Agent

### Option A: Import as Module

```typescript
// In server/agent.js or any file
import { GitAgentIntegration } from './git-agent/src/index';

class MyAgent {
  private gitAgent: GitAgentIntegration;

  constructor() {
    this.gitAgent = new GitAgentIntegration();
    this.gitAgent.initialize({
      repoPath: process.cwd(),
      baseBranch: 'main',
      openaiApiKey: process.env.OPENAI_API_KEY!,
      dryRun: false,
      verbose: true,
    });
  }

  async handleGitCommand(command: string) {
    switch (command) {
      case 'commit':
        return await this.gitAgent.commit();
      case 'pull':
        return await this.gitAgent.pullFromParent();
      case 'status':
        return await this.gitAgent.getStatus();
      case 'workflow':
        return await this.gitAgent.executeWorkflow();
      default:
        return { success: false, message: 'Unknown command' };
    }
  }
}

export default MyAgent;
```

### Option B: Expose via API

```typescript
// In server/routes/git.ts
import express from 'express';
import { gitAgentIntegration } from '../git-agent/src/index';

const router = express.Router();

router.post('/api/git/commit', async (req, res) => {
  try {
    const result = await gitAgentIntegration.commit(req.body.message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/api/git/workflow', async (req, res) => {
  try {
    const result = await gitAgentIntegration.executeWorkflow();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/api/git/status', async (req, res) => {
  try {
    const result = await gitAgentIntegration.getStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Option C: CLI as Subprocess

```typescript
import { spawn } from 'child_process';

async function runGitAgent(command: string) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'cli', command], {
      cwd: 'server/git-agent',
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve('Success');
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Usage
await runGitAgent('workflow');
```

## Selecting Agent from Chat

### Step 1: Update Main Agent File

In `server/agent.js`, add git agent selection:

```javascript
async handleUserInput(input) {
  // Check if user wants to use git agent
  if (input.includes('git') || input.includes('commit') || input.includes('pull')) {
    const gitAgent = new GitAgent();
    
    // Extract git command
    const command = this.parseGitCommand(input);
    
    // Execute git operation
    const result = await gitAgent.execute(command);
    
    return result;
  }
  
  // ... handle other inputs
}

parseGitCommand(input) {
  if (input.includes('commit')) return 'commit';
  if (input.includes('pull')) return 'pull';
  if (input.includes('status')) return 'status';
  if (input.includes('workflow') || input.includes('all')) return 'workflow';
  return 'status'; // default
}
```

### Step 2: Create Selection Interface

Update chat UI to show agent options:

```typescript
// In ChatAssistant.tsx
const agents = [
  { id: 'chat', name: '💬 Chat Assistant', description: 'General chat' },
  { id: 'git', name: '🤖 Git Agent', description: 'Git automation' },
];

function selectAgent() {
  return (
    <div className="agent-selector">
      {agents.map(agent => (
        <button key={agent.id} onClick={() => setActiveAgent(agent.id)}>
          {agent.name}
          <p>{agent.description}</p>
        </button>
      ))}
    </div>
  );
}
```

### Step 3: Route to Git Agent

```typescript
async function processInput(userInput: string) {
  if (activeAgent === 'git') {
    // Send to git agent
    const result = await fetch('/api/agent/git', {
      method: 'POST',
      body: JSON.stringify({ command: userInput }),
    }).then(r => r.json());
    
    return result;
  } else {
    // Send to chat agent
    return await chatAgent.process(userInput);
  }
}
```

## Production Deployment

### Environment Setup

```bash
# Production .env
OPENAI_API_KEY=sk_prod_...
GIT_REPO_PATH=/app/repo
GIT_BASE_BRANCH=main
DRY_RUN=false
LOG_LEVEL=info
NODE_ENV=production
```

### Docker Setup (Optional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY server/git-agent/package*.json ./
RUN npm ci --only=production

COPY server/git-agent/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/cli/cli.js"]
```

### Health Check

```typescript
async function healthCheck() {
  try {
    const isValid = await gitAgent.validateConfig();
    
    if (!isValid) {
      console.error('Git agent health check failed');
      process.exit(1);
    }
    
    console.log('✅ Git agent ready');
  } catch (error) {
    console.error('Health check error:', error);
    process.exit(1);
  }
}

healthCheck();
```

## File Structure

```
server/git-agent/
├── src/
│   ├── services/
│   │   ├── git.service.ts           # Git operations
│   │   ├── ai.service.ts            # OpenAI integration
│   │   ├── conflict-resolver.ts    # Conflict handling
│   │   └── git-agent.ts            # Main orchestrator
│   ├── cli/
│   │   ├── index.ts                # CLI implementation
│   │   └── cli.ts                  # CLI entry point
│   ├── types/
│   │   └── index.ts                # Type definitions
│   ├── utils/
│   │   ├── logger.ts               # Logging
│   │   └── errors.ts               # Error classes
│   └── index.ts                    # Main export
├── dist/                           # Compiled files
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
└── SETUP.md (this file)
```

## Running Tests

```bash
# Unit tests
npm test

# Test with coverage
npm test -- --coverage

# Integration tests
npm test -- integration
```

## Common Issues

### Issue: "OPENAI_API_KEY not found"
**Solution**: Add to .env file or export as environment variable
```bash
export OPENAI_API_KEY=sk_...
```

### Issue: "Cannot find module"
**Solution**: Build TypeScript first
```bash
npm run build
```

### Issue: "Git command not found"
**Solution**: Ensure git is in PATH
```bash
git --version
```

### Issue: "Permission denied"
**Solution**: Check git credentials
```bash
git config --list
```

## Monitoring

### Log Locations
- CLI: `git-agent.log`
- Docker: stdout/stderr
- Production: `/var/log/git-agent.log`

### Key Metrics
- Workflow execution time
- Success/failure rate
- Conflict resolution rate
- AI generation latency
- Error frequency

## Support & Troubleshooting

See [README.md](./README.md#troubleshooting) for detailed troubleshooting guide.

## Next Steps

1. ✅ Install and build
2. ✅ Test with CLI
3. ✅ Set up integration
4. ✅ Configure selection
5. ✅ Deploy to production
6. ✅ Monitor performance

Enjoy your AI-powered Git automation! 🚀
