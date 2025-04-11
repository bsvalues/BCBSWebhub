/**
 * Logger
 * 
 * Provides centralized logging functionality with different log levels,
 * timestamps, and consistent formatting.
 */

// Define log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Map of log level to numeric value for comparison
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3
};

// Logger configuration interface
export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamp: boolean;
  enableConsole: boolean;
  enableFileOutput: boolean;
  logFilePath?: string;
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enableTimestamp: true,
  enableConsole: true,
  enableFileOutput: false
};

// Logger class
class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Update logger configuration
   */
  public configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, ...meta: any[]): void {
    this.log(LogLevel.DEBUG, message, meta);
  }
  
  /**
   * Log an info message
   */
  public info(message: string, ...meta: any[]): void {
    this.log(LogLevel.INFO, message, meta);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, ...meta: any[]): void {
    this.log(LogLevel.WARN, message, meta);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, ...meta: any[]): void {
    this.log(LogLevel.ERROR, message, meta);
  }
  
  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, meta: any[] = []): void {
    // Check if we should log this level
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.config.minLevel]) {
      return;
    }
    
    // Format the log message
    let formattedMessage = message;
    
    // Add timestamp if enabled
    if (this.config.enableTimestamp) {
      const timestamp = new Date().toISOString();
      formattedMessage = `[${timestamp}] ${formattedMessage}`;
    }
    
    // Add log level
    formattedMessage = `[${level}] ${formattedMessage}`;
    
    // Add meta information if provided
    if (meta.length > 0) {
      try {
        const metaString = meta.map(item => {
          if (item instanceof Error) {
            return `${item.name}: ${item.message}\n${item.stack || ''}`;
          }
          return typeof item === 'object' ? JSON.stringify(item, null, 2) : item;
        }).join(' ');
        formattedMessage = `${formattedMessage} ${metaString}`;
      } catch (error) {
        formattedMessage = `${formattedMessage} [Error serializing meta data]`;
      }
    }
    
    // Output to console if enabled
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    }
    
    // Output to file if enabled
    if (this.config.enableFileOutput && this.config.logFilePath) {
      // In a real implementation, we would append to a file
      // For simplicity, we're not implementing file logging here
    }
  }
  
  /**
   * Create a child logger with a specific prefix
   */
  public createChild(prefix: string): Logger {
    const childLogger = new Logger(this.config);
    
    // Override the log method to add the prefix
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, meta: any[] = []) => {
      originalLog(level, `[${prefix}] ${message}`, meta);
    };
    
    return childLogger;
  }
}

// Create and export the default logger instance
export const logger = new Logger();