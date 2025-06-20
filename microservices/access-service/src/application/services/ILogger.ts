export interface ILogger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error: Error, context?: any): void;
  
  // Structured logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: {
    error?: Error;
    context?: any;
    tags?: string[];
    duration?: number;
  }): void;
  
  // Performance logging
  startTimer(): () => void;
  
  // Child logger with context
  child(context: any): ILogger;
}