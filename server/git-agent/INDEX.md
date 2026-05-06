# 📚 Git Agent Complete Guide

Welcome to the AI-powered Git Agent! This is your central hub for all documentation and information.

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Install
cd server/git-agent
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your OpenAI API key

# 3. Build
npm run build

# 4. Run
npm run cli workflow
```

## 📖 Documentation Map

### For Getting Started
- **[SETUP.md](./SETUP.md)** - Installation, configuration, and first run
- **[README.md](./README.md)** - Feature overview and capabilities

### For Integration
- **[EXAMPLES.md](./EXAMPLES.md)** - 10+ production-ready examples
- **[API.md](./API.md)** - Complete API reference

### For Development
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and internals
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions

## 🎯 What Can It Do?

### Core Features ✨
- 🤖 **AI Commit Messages**: Automatically generate meaningful commits
- 🔄 **Smart Pulling**: Safely pull from parent branch
- 🚨 **Conflict Resolution**: Intelligent merge conflict handling
- 📤 **Auto Push**: Push resolved changes to remote
- 🔙 **Rollback Support**: Safe recovery from failures

### How It Works 🔧
1. **Stage Changes** - Prepare your modifications
2. **Pull Latest** - Get parent branch updates
3. **Resolve Conflicts** - Handle any merge conflicts
4. **Generate Commit** - Create AI-powered message
5. **Push Changes** - Send to remote
6. **Log Results** - Track operations

## 💻 Usage Modes

### 1. Command Line Interface
```bash
npm run cli workflow       # Run full workflow
npm run cli status        # Check status
npm run cli config        # Setup configuration
npm run cli resolve-conflicts  # Manual conflict resolution
```

### 2. Programmatic Integration
```typescript
import { GitAgentIntegration } from './src/index';

const agent = new GitAgentIntegration();
agent.initialize(config);
const result = await agent.executeWorkflow();
```

### 3. REST API
```bash
POST /api/git/workflow   # Run workflow
GET  /api/git/status    # Get status
POST /api/git/commit    # Create commit
```

### 4. Chat Agent Selection
Select "Git Agent" from your chat interface and issue commands naturally.

## 📁 Project Structure

```
server/git-agent/
├── src/
│   ├── services/
│   │   ├── git.service.ts           # 600+ lines of git operations
│   │   ├── ai.service.ts            # OpenAI integration
│   │   ├── conflict-resolver.ts    # Intelligent conflict handling
│   │   └── git-agent.ts            # Main orchestrator
│   ├── cli/
│   │   ├── index.ts                # CLI with inquirer
│   │   └── cli.ts                  # CLI entry point
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── utils/
│   │   ├── logger.ts               # Colored logging
│   │   └── errors.ts               # Error classes
│   └── index.ts                    # Main export
├── dist/                           # Compiled JavaScript
├── tests/                          # Test suite
├── docs/                           # Documentation
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── .env.example                    # Environment template
├── README.md                       # Overview
├── SETUP.md                        # Installation
├── API.md                          # API reference
├── EXAMPLES.md                     # Integration examples
└── ARCHITECTURE.md                 # System design
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk_...                    # Your OpenAI API key

# Optional
GIT_REPO_PATH=./                         # Repository path
GIT_BASE_BRANCH=main                     # Parent branch
DRY_RUN=false                            # Test without changes
AUTO_RESOLVE_STRATEGY=keep-current       # Conflict strategy
LOG_LEVEL=info                           # Logging level
NODE_ENV=development                     # Environment
```

### Programmatic Config
```typescript
interface AgentConfig {
  repoPath: string;                      // Path to repo
  baseBranch: string;                    // Pull from branch
  openaiApiKey: string;                  // OpenAI API key
  dryRun: boolean;                       // Safe testing mode
  verbose: boolean;                      // Detailed logging
  autoResolveStrategy?: 'keep-current' | 'accept-incoming';
}
```

## 📊 Key Features

### 1. Intelligent Staging
```typescript
await gitAgent.stageChanges();      // Stage all
await gitAgent.stageChanges([...]) // Stage specific files
```

### 2. Safe Pulling
```typescript
const result = await gitAgent.pullFromParent();
// Creates backup stash
// Handles conflicts automatically
```

### 3. Smart Conflict Resolution
```typescript
const conflicts = await gitAgent.checkForConflicts();
// Parse conflict markers
// Show differences clearly
// Apply strategy (keep/accept/manual)
```

### 4. AI Commit Messages
```typescript
const message = await aiService.generateCommitMessage(diff);
// Analyzes code changes
// Generates professional message
// Uses fallback if API fails
```

### 5. Automatic Pushes
```typescript
await gitAgent.push();
// Pushes to origin
// Handles errors
```

## 🎓 Learning Path

### Beginner
1. Read [README.md](./README.md) for overview
2. Follow [SETUP.md](./SETUP.md) for installation
3. Try CLI: `npm run cli workflow`

### Intermediate
1. Review [EXAMPLES.md](./EXAMPLES.md) examples
2. Explore [API.md](./API.md) for available methods
3. Try REST API integration

### Advanced
1. Study [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Review service implementations
3. Create custom extensions

## 🐛 Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| API key invalid | Check .env file, verify key format |
| Git command failed | Ensure git is installed and in PATH |
| Conflicts not detected | Verify merge actually creates conflicts |
| Timeout errors | Check network, increase timeout |
| Build errors | Run `npm install` and `npm run build` |

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed solutions.

## 📈 Performance

Typical execution times:
- **Staging**: 50-100ms
- **Status Check**: 100-200ms
- **Diff Analysis**: 200-500ms
- **AI Generation**: 2-5 seconds
- **Full Workflow**: 10-30 seconds

## 🔒 Security

### Best Practices
- ✅ Store API keys in .env (not in code)
- ✅ Use environment variables
- ✅ Rotate keys regularly
- ✅ Audit operations with logs
- ✅ Test with dry-run mode first
- ✅ Review AI-generated messages

### Error Handling
```typescript
try {
  const result = await agent.executeFullWorkflow();
  if (!result.success) {
    console.error('Error:', result.error);
    if (result.rollbackAvailable) {
      console.log('Rolled back successfully');
    }
  }
} catch (error) {
  console.error('Fatal error:', error);
}
```

## 🚀 Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --production
CMD ["npm", "start"]
```

### Environment Setup
```bash
# Production
OPENAI_API_KEY=sk_prod_...
GIT_REPO_PATH=/app/repo
DRY_RUN=false
NODE_ENV=production
```

### Health Check
```typescript
const isValid = await agent.validateConfig();
if (!isValid) process.exit(1);
```

## 📊 Monitoring

Track these metrics:
- Workflow success rate
- Average execution time
- Conflict resolution rate
- API error frequency
- Rollback usage

## 🤝 Integration Points

### With Existing Systems
1. **Chat Agent** - Natural language interface
2. **Express API** - REST endpoints
3. **Webhooks** - Automated triggers
4. **Scheduled Tasks** - Cron jobs
5. **Notifications** - Email/Slack alerts

### Example Flows
```
Chat Agent → Git Agent → Execution → Notification
Webhook → Git Agent → Workflow → Success/Error
Cron Job → Git Agent → Auto-commit → Logging
```

## 📚 Resources

### Official Docs
- [OpenAI API](https://platform.openai.com/docs)
- [Simple-Git](https://github.com/steveukx/git-js)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Examples
See [EXAMPLES.md](./EXAMPLES.md) for 10+ production examples:
- CLI Usage
- Express Integration
- Chat Agent Integration
- React Component
- Webhook Handling
- Scheduled Tasks
- Error Notifications
- Monitoring
- Configuration Management
- Testing

## 💡 Tips & Tricks

### Tip 1: Test with Dry-Run First
```bash
DRY_RUN=true npm run cli workflow
```

### Tip 2: View Detailed Logs
```bash
cat git-agent.log
tail -f git-agent.log
```

### Tip 3: Check Recent Commits
```typescript
const logs = await gitService.getCommitLog(10);
logs.forEach(commit => console.log(commit.message));
```

### Tip 4: Manual Conflict Resolution
```bash
npm run cli resolve-conflicts
```

### Tip 5: Custom Commit Messages
```typescript
await gitAgent.commit("Custom: your message here");
```

## 🎯 Next Steps

1. ✅ Install and configure
2. ✅ Test with CLI
3. ✅ Integrate with your app
4. ✅ Set up monitoring
5. ✅ Deploy to production

## 📞 Getting Help

### Documentation
- [README.md](./README.md) - Overview
- [SETUP.md](./SETUP.md) - Installation
- [API.md](./API.md) - API Reference
- [EXAMPLES.md](./EXAMPLES.md) - Integration Examples
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System Design
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Solutions

### Quick Links
- View logs: `cat git-agent.log`
- Build: `npm run build`
- Test CLI: `npm run cli status`
- Check version: `npm list`

## 📝 Summary

The Git Agent is a **production-ready system** for:
- ✅ Automated git operations
- ✅ Intelligent conflict resolution
- ✅ AI-powered commit messages
- ✅ Safe testing with dry-run mode
- ✅ Comprehensive error handling
- ✅ Full rollback support

**Get started in 5 minutes** with the [Quick Start](#-quick-start-5-minutes) guide above!

---

**Last Updated**: 2024
**Version**: 1.0.0
**License**: MIT

**Happy committing! 🎉**
