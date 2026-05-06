# 🤖 Git Agent - AI-Powered Git Automation

Production-ready AI-powered Git agent with intelligent conflict resolution, automated commit messages, and comprehensive CLI interface.

## Features

✨ **Core Capabilities**
- ⚡ Automatic staging and committing with AI-generated messages
- 🔄 Smart pulling from parent/base branch
- 🚨 Intelligent merge conflict detection and resolution
- 📤 Automated pushing to remote
- 🔙 Rollback mechanism for failed operations
- 📊 Detailed operation logging

🎯 **Intelligent Features**
- 🧠 OpenAI-powered commit message generation
- 🤝 Interactive conflict resolution
- 📝 Colored diff output
- 🎛️ Auto-resolve strategies (keep-current, accept-incoming)
- 🌳 Dry-run mode for safe testing

🏗️ **Architecture**
- Modular service-based design
- TypeScript for type safety
- Clean separation of concerns
- Easy integration with existing agents
- Production-ready error handling

## Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Git
- OpenAI API key

### Setup

1. **Install dependencies:**
```bash
cd server/git-agent
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your OpenAI API key
```

3. **Build the project:**
```bash
npm run build
```

## Usage

### CLI Interface

#### Run Full Workflow
```bash
npm run cli workflow
```

#### Check Repository Status
```bash
npm run cli status
```

#### Manually Resolve Conflicts
```bash
npm run cli resolve-conflicts
```

#### Setup Configuration
```bash
npm run cli config
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk_...

# Optional
GIT_REPO_PATH=./
GIT_BASE_BRANCH=main
DRY_RUN=false
AUTO_RESOLVE_STRATEGY=  # keep-current | accept-incoming
LOG_LEVEL=info
```

### Programmatic Integration

```typescript
import { GitAgentIntegration } from './server/git-agent/src/index';

const agent = new GitAgentIntegration();

// Initialize
agent.initialize({
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: false,
  verbose: true,
});

// Execute workflow
const result = await agent.executeWorkflow();
console.log(result);
```

## Architecture

### Service Modules

#### GitService
Handles all Git operations:
- Status checking
- Staging and committing
- Pulling and pushing
- Conflict detection
- File operations

```typescript
const gitService = new GitService(repoPath, logger);
await gitService.stage();
await gitService.commit('Fix: bug in auth');
await gitService.push();
```

#### AIService
Generates commit messages using OpenAI:
- Analyzes code diffs
- Generates professional commit messages
- Fallback to heuristic-based generation
- Retry logic with rate limiting

```typescript
const aiService = new AIService(apiKey, logger);
const message = await aiService.generateCommitMessage(diff, branchName);
```

#### ConflictResolver
Intelligent conflict resolution:
- Parses conflict markers
- Displays conflicts clearly
- Auto-merge simple conflicts
- Manual resolution support

```typescript
const resolver = new ConflictResolver(repoPath, logger);
const conflicts = await resolver.getMergeConflictContext(...);
resolver.displayConflictContext(conflict);
```

#### GitAgent
Main orchestrator:
- Coordinates all services
- Implements full workflow
- Handles errors and rollbacks
- Logs operations

```typescript
const agent = new GitAgent(config, logger);
const result = await agent.executeFullWorkflow();
```

## Workflow Overview

```
┌─────────────────────────────────────────┐
│  1. Stage Changes                       │
│     - Get repo status                   │
│     - Stage all or specific files       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  2. Pull from Parent Branch             │
│     - Create backup stash               │
│     - Pull latest changes               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  3. Detect Conflicts                    │
│     - Check for merge conflicts         │
│     - List conflicting files            │
└──────┬──────────────────────┬───────────┘
       │                      │
    NO │                      │ YES
       │                      │
       │       ┌──────────────▼─────────┐
       │       │ 4. Resolve Conflicts   │
       │       │    - Parse markers     │
       │       │    - Apply strategy    │
       │       │    - Stage resolved    │
       │       └──────────────┬─────────┘
       │                      │
┌──────▼──────────────────────▼─────────┐
│  5. Generate & Commit                  │
│     - Get diff                         │
│     - Generate AI message              │
│     - Create commit                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  6. Push to Remote                      │
│     - Push to origin                    │
│     - Handle errors                     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│  ✅ Success / ❌ Failure                │
│     - Log operations                    │
│     - Rollback on error                 │
└─────────────────────────────────────────┘
```

## Examples

### Example 1: Simple Workflow

```typescript
import { GitAgent } from './server/git-agent/src/services/git-agent';
import Logger from './server/git-agent/src/utils/logger';

const logger = new Logger();
const config = {
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: false,
  verbose: true,
};

const agent = new GitAgent(config, logger);
const result = await agent.executeFullWorkflow();

if (result.success) {
  console.log('✅ Workflow completed!');
  console.log('Commit:', result.data.commitHash);
} else {
  console.log('❌ Error:', result.error);
}
```

### Example 2: CLI Usage

```bash
# Setup configuration
npm run cli config

# Run workflow
npm run cli workflow

# Check status
npm run cli status

# Resolve conflicts manually
npm run cli resolve-conflicts
```

### Example 3: Dry-Run Mode

```typescript
const config = {
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: true,  // ← Enable dry-run
  verbose: true,
};

// No actual git changes will be made
const agent = new GitAgent(config, logger);
await agent.executeFullWorkflow();
```

### Example 4: Auto-Resolution

```typescript
const config = {
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: false,
  verbose: true,
  autoResolveStrategy: 'keep-current', // Automatically keep current branch
};

const agent = new GitAgent(config, logger);
await agent.executeFullWorkflow();
```

### Example 5: Integration with Chat Agent

```typescript
// In your chat agent (e.g., server/agent.js)
import { gitAgentIntegration } from './git-agent/src/index';

// Initialize once
gitAgentIntegration.initialize({
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: false,
  verbose: true,
});

// Use in chat agent responses
async function handleGitCommand(command) {
  switch (command) {
    case 'commit':
      return await gitAgentIntegration.commit();
    case 'status':
      return await gitAgentIntegration.getStatus();
    case 'workflow':
      return await gitAgentIntegration.executeWorkflow();
  }
}
```

## Error Handling

The agent includes comprehensive error handling:

```typescript
try {
  const result = await agent.executeFullWorkflow();
  
  if (!result.success) {
    console.error('Error:', result.error);
    
    // Rollback information available
    if (result.rollbackAvailable) {
      console.log('Rollback was attempted');
    }
  }
} catch (error) {
  // Handle unexpected errors
  logger.error('Unexpected error:', error);
}
```

### Error Types

- **GitOperationError**: Git command failed
- **ConflictResolutionError**: Conflict resolution failed
- **AIServiceError**: OpenAI API error (retryable or not)
- **ValidationError**: Configuration validation failed
- **RollbackError**: Rollback operation failed

## Logging

The agent includes detailed logging:

```typescript
const logger = new Logger({
  color: true,
  toFile: true,
  filePath: './git-agent.log'
});

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.success('Success message');
```

## Configuration Options

```typescript
interface AgentConfig {
  repoPath: string;              // Path to git repository
  baseBranch: string;            // Branch to pull from (e.g., 'main')
  openaiApiKey: string;          // OpenAI API key
  dryRun: boolean;               // No actual changes
  verbose: boolean;              // Detailed logging
  autoResolveStrategy?: 'keep-current' | 'accept-incoming';
}
```

## Production Checklist

- [ ] Configure OpenAI API key securely
- [ ] Set up logging rotation
- [ ] Configure error notifications
- [ ] Test with dry-run mode first
- [ ] Set up git credentials/SSH
- [ ] Configure base branch correctly
- [ ] Test conflict resolution scenarios
- [ ] Set up monitoring/alerts
- [ ] Review commit messages generated
- [ ] Test rollback mechanism

## Troubleshooting

### "Invalid OpenAI API key"
- Check API key is correct
- Verify key has sufficient quota
- Check for whitespace in key

### "Repository path does not exist"
- Verify repo path is correct
- Check permissions

### "Merge conflicts not detected"
- Ensure pull actually creates conflicts
- Check conflict markers in files
- Verify merge is in progress

### "Commit message too long"
- Messages are automatically truncated at 72 chars
- Fallback message used if AI fails

## Performance

- **Staging**: < 100ms
- **Diff Analysis**: < 500ms
- **AI Generation**: 2-5s (with fallback)
- **Push**: Depends on network
- **Full Workflow**: 5-30s typical

## API Reference

See [API.md](./API.md) for complete API documentation.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- GitHub Issues: [Report bugs](https://github.com/your-repo/issues)
- Discussions: [Ask questions](https://github.com/your-repo/discussions)
- Documentation: [Full docs](./docs/)

## Roadmap

- [ ] Branch protection validation
- [ ] Commit signing (GPG)
- [ ] Custom commit templates
- [ ] Multi-branch support
- [ ] Webhook integrations
- [ ] Dashboard UI
- [ ] Analytics and metrics
