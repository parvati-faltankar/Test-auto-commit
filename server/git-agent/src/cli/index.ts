/**
 * CLI Interface for Git Agent
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import Logger from '../utils/logger';
import { GitAgent } from '../services/git-agent';
import { ConflictFile, AgentConfig } from '../types';
import { ConflictResolver } from '../services/conflict-resolver';
import { GitService } from '../services/git.service';
import { ValidationError } from '../utils/errors';

export class GitAgentCLI {
  private logger: Logger;
  private agent?: GitAgent;

  constructor() {
    this.logger = new Logger({ color: true });
  }

  /**
   * Main CLI entry point
   */
  async run(args?: string[]): Promise<void> {
    try {
      this.logger.section('🤖 Git Agent CLI');

      // Parse arguments
      const command = args?.[0] || (await this.selectCommand());

      switch (command) {
        case 'workflow':
          await this.runFullWorkflow();
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'resolve-conflicts':
          await this.resolveConflicts();
          break;
        case 'config':
          await this.setupConfig();
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          this.logger.error(`Unknown command: ${command}`);
          this.showHelp();
      }
    } catch (error) {
      this.logger.error(`CLI Error: ${error}`);
      process.exit(1);
    }
  }

  /**
   * Select command interactively
   */
  private async selectCommand(): Promise<string> {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: chalk.cyan('What would you like to do?'),
        choices: [
          { name: 'Run full Git workflow (stage → pull → commit → push)', value: 'workflow' },
          { name: 'Show repository status', value: 'status' },
          { name: 'Resolve conflicts manually', value: 'resolve-conflicts' },
          { name: 'Setup configuration', value: 'config' },
          { name: 'Show help', value: 'help' },
          new inquirer.Separator(),
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (answers.command === 'exit') {
      this.logger.info('Goodbye!');
      process.exit(0);
    }

    return answers.command;
  }

  /**
   * Setup configuration
   */
  private async setupConfig(): Promise<void> {
    this.logger.section('⚙️  Configuration Setup');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoPath',
        message: 'Repository path:',
        default: process.cwd(),
        validate: (input) => input.trim().length > 0 || 'Path cannot be empty',
      },
      {
        type: 'input',
        name: 'baseBranch',
        message: 'Base branch for pulling:',
        default: 'main',
      },
      {
        type: 'password',
        name: 'openaiApiKey',
        message: 'OpenAI API key:',
        validate: (input) => input.trim().length > 0 || 'API key cannot be empty',
      },
      {
        type: 'confirm',
        name: 'dryRun',
        message: 'Enable dry-run mode? (no actual commits/pushes)',
        default: false,
      },
      {
        type: 'list',
        name: 'autoResolveStrategy',
        message: 'Auto-resolve conflicts with:',
        choices: [
          { name: 'Manual resolution (ask each time)', value: undefined },
          { name: 'Keep current branch changes', value: 'keep-current' },
          { name: 'Accept incoming changes', value: 'accept-incoming' },
        ],
      },
    ]);

    const config: AgentConfig = {
      repoPath: answers.repoPath,
      baseBranch: answers.baseBranch,
      openaiApiKey: answers.openaiApiKey,
      dryRun: answers.dryRun,
      verbose: true,
      autoResolveStrategy: answers.autoResolveStrategy,
    };

    // Validate config
    this.agent = new GitAgent(config, this.logger);
    const isValid = await this.agent.validateConfig();

    if (isValid) {
      this.logger.success('Configuration is valid!');
      // In production, save to .env or config file
    } else {
      this.logger.error('Configuration validation failed');
    }
  }

  /**
   * Run full workflow
   */
  private async runFullWorkflow(): Promise<void> {
    this.logger.section('🔄 Running Git Workflow');

    // Get config if not set
    if (!this.agent) {
      const config = await this.getOrCreateConfig();
      this.agent = new GitAgent(config, this.logger);
    }

    // Confirm before proceeding
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: chalk.yellow(
          'This will stage changes, pull from parent branch, resolve conflicts, commit, and push. Continue?',
        ),
        default: false,
      },
    ]);

    if (!answers.proceed) {
      this.logger.info('Cancelled');
      return;
    }

    // Execute workflow
    const result = await this.agent.executeFullWorkflow();

    if (result.success) {
      this.logger.success(`✅ ${result.message}`);
      if (result.data) {
        this.logger.info(`Commit: ${result.data.commitHash}`);
        if (result.data.conflictsResolved) {
          this.logger.info('Conflicts were resolved');
        }
      }
    } else {
      this.logger.error(`❌ ${result.error || result.message}`);
      if (result.rollbackAvailable) {
        this.logger.info(`Rollback was attempted: ${result.data?.rollback?.message}`);
      }
    }

    // Show operation logs
    const logs = this.agent.getOperationLogs();
    if (logs.length > 0) {
      this.logger.section('📋 Operation Logs');
      logs.forEach((log) => {
        const icon =
          log.status === 'completed' ? '✅' : log.status === 'failed' ? '❌' : '⏳';
        console.log(
          `${icon} [${log.timestamp.toISOString()}] ${log.operation}: ${log.status}`,
        );
        if (log.details) {
          console.log(`   ${log.details}`);
        }
      });
    }
  }

  /**
   * Show repository status
   */
  private async showStatus(): Promise<void> {
    this.logger.section('📊 Repository Status');

    if (!this.agent) {
      const config = await this.getOrCreateConfig();
      this.agent = new GitAgent(config, this.logger);
    }

    const status = await this.agent.getStatus();

    console.log(chalk.cyan(`\n📍 Branch: ${status.branch}`));
    console.log(chalk.cyan(`🔄 Dirty: ${status.isDirty ? 'Yes' : 'No'}`));

    if (status.status.staged.length > 0) {
      console.log(chalk.green(`\n✅ Staged (${status.status.staged.length}):`));
      status.status.staged.forEach((file: string) => console.log(`   ${file}`));
    }

    if (status.status.unstaged.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Unstaged (${status.status.unstaged.length}):`));
      status.status.unstaged.forEach((file: string) => console.log(`   ${file}`));
    }

    if (status.status.untracked.length > 0) {
      console.log(chalk.dim(`\n❓ Untracked (${status.status.untracked.length}):`));
      status.status.untracked.forEach((file: string) => console.log(`   ${file}`));
    }

    if (status.recentCommits.length > 0) {
      console.log(chalk.blue('\n📜 Recent Commits:'));
      status.recentCommits.forEach((commit: any, idx: number) => {
        console.log(`   ${idx + 1}. ${commit.hash.substring(0, 7)} - ${commit.message}`);
      });
    }
  }

  /**
   * Resolve conflicts manually
   */
  private async resolveConflicts(): Promise<void> {
    this.logger.section('🔧 Manual Conflict Resolution');

    if (!this.agent) {
      const config = await this.getOrCreateConfig();
      this.agent = new GitAgent(config, this.logger);
    }

    const gitService = new GitService(
      (this.agent as any).config.repoPath,
      this.logger,
    );
    const conflictResolver = new ConflictResolver(
      (this.agent as any).config.repoPath,
      this.logger,
    );

    // Get conflicting files
    const conflictingFiles = await gitService.getConflictingFiles();

    if (conflictingFiles.length === 0) {
      this.logger.info('No conflicting files found');
      return;
    }

    this.logger.warn(`Found ${conflictingFiles.length} conflicting file(s)`);

    // Process each conflict
    for (const filePath of conflictingFiles) {
      const conflict = await conflictResolver.parseConflictingFile(filePath);
      conflictResolver.displayConflictContext(conflict);

      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'strategy',
          message: `How to resolve ${filePath}?`,
          choices: [
            { name: 'Keep current branch changes', value: 'keep-current' },
            { name: 'Accept incoming changes', value: 'accept-incoming' },
            { name: 'Manual edit (skip for now)', value: 'skip' },
          ],
        },
      ]);

      if (answers.strategy === 'keep-current') {
        await conflictResolver.resolveKeepCurrent(filePath);
        await gitService.stage([filePath]);
        this.logger.success(`Resolved ${filePath}`);
      } else if (answers.strategy === 'accept-incoming') {
        await conflictResolver.resolveAcceptIncoming(filePath);
        await gitService.stage([filePath]);
        this.logger.success(`Resolved ${filePath}`);
      } else {
        this.logger.info(`Skipped ${filePath} for manual editing`);
      }
    }

    this.logger.success('Conflict resolution complete');
  }

  /**
   * Get or create configuration
   */
  private async getOrCreateConfig(): Promise<AgentConfig> {
    // Check for env variables
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY environment variable not set');
      await this.setupConfig();
    }

    return {
      repoPath: process.env.GIT_REPO_PATH || process.cwd(),
      baseBranch: process.env.GIT_BASE_BRANCH || 'main',
      openaiApiKey: apiKey || '',
      dryRun: process.env.DRY_RUN === 'true',
      verbose: true,
    };
  }

  /**
   * Show help
   */
  private showHelp(): void {
    this.logger.section('📚 Help');

    console.log(chalk.cyan('\nAvailable Commands:\n'));
    console.log(chalk.green('  workflow') + '             Run full Git workflow');
    console.log(chalk.green('  status') + '               Show repository status');
    console.log(chalk.green('  resolve-conflicts') + '    Manually resolve conflicts');
    console.log(chalk.green('  config') + '               Setup configuration');
    console.log(chalk.green('  help') + '                 Show this help message\n');

    console.log(chalk.cyan('Environment Variables:\n'));
    console.log(chalk.yellow('  OPENAI_API_KEY') + '     Your OpenAI API key (required)');
    console.log(chalk.yellow('  GIT_REPO_PATH') + '       Path to git repository');
    console.log(chalk.yellow('  GIT_BASE_BRANCH') + '     Base branch for pulls\n');

    console.log(chalk.cyan('Example Usage:\n'));
    console.log(chalk.dim('  $ npx ts-node src/cli/index.ts workflow'));
    console.log(chalk.dim('  $ OPENAI_API_KEY=sk-xxx npx ts-node src/cli/index.ts workflow\n'));
  }
}

// Re-export for imports
export { GitService } from '../services/git.service';
export { ConflictResolver } from '../services/conflict-resolver';
