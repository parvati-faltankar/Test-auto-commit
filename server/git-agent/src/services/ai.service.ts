/**
 * AI Service - Generates commit messages using OpenAI
 */

import axios from 'axios';
import Logger from '../utils/logger';
import { AIServiceError } from '../utils/errors';
import { DiffInfo } from '../types';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AIService {
  private apiKey: string;
  private logger: Logger;
  private model: string = 'gpt-3.5-turbo';
  private maxRetries: number = 3;

  constructor(apiKey: string, logger: Logger) {
    if (!apiKey) {
      throw new AIServiceError('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    this.logger = logger;
  }

  /**
   * Generate commit message based on diff
   */
  async generateCommitMessage(diff: DiffInfo, branchName: string = ''): Promise<string> {
    try {
      this.logger.debug('Generating commit message with AI...');

      // Create a summary of changes for the prompt
      const changeSummary = `
Files Changed: ${diff.filesChanged}
Insertions: ${diff.insertions}
Deletions: ${diff.deletions}

Diff Preview (first 2000 chars):
${diff.diff.substring(0, 2000)}${diff.diff.length > 2000 ? '...' : ''}
`;

      const prompt = `You are a Git commit message generator. Generate a single, concise, professional commit message (max 72 characters) based on the following code changes.

${branchName ? `Branch: ${branchName}\n` : ''}
${changeSummary}

Requirements:
- Use imperative mood (e.g., "Add", "Fix", "Update")
- First letter capitalized
- No period at the end
- Maximum 72 characters
- Be specific about what changed

Generate ONLY the commit message, nothing else.`;

      const message = await this.callOpenAIWithRetry(prompt);
      this.logger.success(`Generated commit message: ${message}`);

      return message.trim();
    } catch (error) {
      if (error instanceof AIServiceError) {
        if (error.retryable) {
          this.logger.warn('Failed to generate commit message, using fallback');
          return this.generateFallbackCommitMessage(diff, branchName);
        }
        throw error;
      }
      throw new AIServiceError(`Unexpected error: ${error}`, true);
    }
  }

  /**
   * Generate fallback commit message (without AI)
   */
  private generateFallbackCommitMessage(diff: DiffInfo, branchName: string = ''): string {
    const parts: string[] = [];

    // Determine type of change
    if (diff.deletions > diff.insertions && diff.insertions === 0) {
      parts.push('Remove');
    } else if (diff.insertions > diff.deletions * 2) {
      parts.push('Add');
    } else if (diff.insertions > 0 && diff.deletions > 0) {
      parts.push('Update');
    } else {
      parts.push('Modify');
    }

    // Add branch context if available
    if (branchName && !branchName.includes('main') && !branchName.includes('develop')) {
      parts.push(`feature in ${branchName}`);
    } else {
      parts.push('code');
    }

    // Add change statistics
    if (diff.filesChanged > 1) {
      parts.push(`(${diff.filesChanged} files)`);
    }

    const message = parts.join(' ');
    return message.substring(0, 72);
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAIWithRetry(prompt: string, retry: number = 0): Promise<string> {
    try {
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful Git commit message generator. Generate concise, professional commit messages.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new AIServiceError('Empty response from OpenAI', true);
      }

      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new AIServiceError('Invalid OpenAI API key', false);
        }
        if (error.response?.status === 429) {
          if (retry < this.maxRetries) {
            this.logger.warn(`Rate limited, retrying in 2s... (${retry + 1}/${this.maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return this.callOpenAIWithRetry(prompt, retry + 1);
          }
        }
        if (error.code === 'ECONNABORTED') {
          throw new AIServiceError('Request timeout', true);
        }
      }
      throw new AIServiceError(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true,
      );
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      this.logger.debug('Validating OpenAI API key...');
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });
      this.logger.success('OpenAI API key is valid');
      return !!response.data?.data?.length;
    } catch (error) {
      this.logger.error('Invalid OpenAI API key');
      return false;
    }
  }

  /**
   * Analyze code changes for suggestions
   */
  async analyzeChanges(diff: string): Promise<string[]> {
    try {
      this.logger.debug('Analyzing code changes...');

      const prompt = `Analyze the following code changes and provide 2-3 brief suggestions for improvement or considerations (if any). Format as bullet points.

${diff.substring(0, 3000)}

Provide suggestions only if there are obvious issues (e.g., potential bugs, security concerns). If code looks fine, respond with: "No issues detected."`;

      const response = await this.callOpenAIWithRetry(prompt);
      return response
        .split('\n')
        .filter((line) => line.trim().length > 0 && line.startsWith('-'));
    } catch (error) {
      this.logger.warn('Failed to analyze changes');
      return [];
    }
  }
}
