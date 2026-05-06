/**
 * Custom error classes for Git Agent
 */

export class GitAgentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitAgentError';
  }
}

export class GitOperationError extends GitAgentError {
  constructor(message: string, public readonly command?: string) {
    super(message);
    this.name = 'GitOperationError';
  }
}

export class ConflictResolutionError extends GitAgentError {
  constructor(message: string, public readonly conflictFiles?: string[]) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

export class AIServiceError extends GitAgentError {
  constructor(message: string, public readonly retryable: boolean = false) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class ValidationError extends GitAgentError {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RollbackError extends GitAgentError {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RollbackError';
  }
}
