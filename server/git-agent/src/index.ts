/**
 * Agent Integration Module - Connect with your chat agent
 */

import Logger from '../utils/logger';
import { GitAgent } from '../services/git-agent';
import { AgentConfig, AgentResult } from '../types';

export class GitAgentIntegration {
  private agent?: GitAgent;
  private logger: Logger;
  private config?: AgentConfig;

  constructor() {
    this.logger = new Logger({ color: false });
  }

  /**
   * Initialize the agent with config
   */
  initialize(config: AgentConfig): void {
    this.config = config;
    this.agent = new GitAgent(config, this.logger);
  }

  /**
   * Stage changes
   */
  async stageChanges(files?: string[]): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
        error: 'Call initialize() first',
      };
    }

    try {
      const gitService = (this.agent as any).gitService;
      await gitService.stage(files);

      return {
        success: true,
        message: 'Changes staged successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to stage changes',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Pull from parent branch
   */
  async pullFromParent(): Promise<AgentResult> {
    if (!this.agent || !this.config) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    try {
      const gitService = (this.agent as any).gitService;
      await gitService.pull(this.config.baseBranch);

      return {
        success: true,
        message: `Pulled from ${this.config.baseBranch}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Pull failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check for conflicts
   */
  async checkForConflicts(): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    try {
      const gitService = (this.agent as any).gitService;
      const hasConflicts = await gitService.hasConflicts();
      const conflictFiles = hasConflicts ? await gitService.getConflictingFiles() : [];

      return {
        success: true,
        message: hasConflicts ? 'Conflicts detected' : 'No conflicts',
        data: {
          hasConflicts,
          conflictFiles,
          count: conflictFiles.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check conflicts',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Commit changes
   */
  async commit(customMessage?: string): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    try {
      const gitService = (this.agent as any).gitService;
      const aiService = (this.agent as any).aiService;

      let message = customMessage;

      if (!message) {
        // Generate message from diff
        const diff = await gitService.getDiff(true);
        const branch = await gitService.getCurrentBranch();
        message = await aiService.generateCommitMessage(diff, branch);
      }

      const commit = await gitService.commit(message, this.config?.dryRun);

      return {
        success: !!commit,
        message: 'Changes committed',
        data: { commit },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to commit',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Push changes
   */
  async push(): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    try {
      const gitService = (this.agent as any).gitService;
      await gitService.push(this.config?.dryRun);

      return {
        success: true,
        message: 'Changes pushed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to push',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute full workflow
   */
  async executeWorkflow(): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    return this.agent.executeFullWorkflow();
  }

  /**
   * Get repository status
   */
  async getStatus(): Promise<AgentResult> {
    if (!this.agent) {
      return {
        success: false,
        message: 'Agent not initialized',
      };
    }

    try {
      const status = await this.agent.getStatus();
      return {
        success: true,
        message: 'Status retrieved',
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get status',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<boolean> {
    if (!this.agent) {
      return false;
    }

    return this.agent.validateConfig();
  }
}

// Export as singleton
export const gitAgentIntegration = new GitAgentIntegration();
