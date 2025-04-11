/**
 * Configuration Manager
 * 
 * Provides centralized configuration management with environment-specific overrides,
 * runtime updates, and validation.
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from './logger';

// Configuration validation result
export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
}

// Default configuration
const defaultConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    apiPrefix: '/api',
    allowCors: true,
    corsOptions: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
    }
  },
  database: {
    connectionString: process.env.DATABASE_URL || '',
    maxConnections: 10,
    idleTimeoutMillis: 30000
  },
  agents: {
    enableMCP: true,
    enableDataValidation: true,
    enableValuation: true,
    enableCompliance: true,
    enableUserInteraction: true,
    messagingTimeoutMs: 30000,
    enablePersistence: false,
    taskQueueSize: 100
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false,
    filePath: './logs/app.log'
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
    jwtExpiresIn: '1d',
    bcryptRounds: 10,
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15 * 60 * 1000 // 15 minutes
    }
  },
  features: {
    enableDynamicAgentLoading: false,
    enableReplayBuffer: true,
    enableAgentRegistry: true,
    enableMetrics: true,
    enableHealthCheck: true
  },
  environment: process.env.NODE_ENV || 'development'
};

// Configuration class
export class ConfigManager {
  private config: Record<string, any> = {};
  private configPath: string | null = null;
  private readonly defaults: Record<string, any>;
  private readonly environment: string;
  
  constructor(defaults: Record<string, any> = {}, configPath?: string) {
    this.defaults = defaults;
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = configPath || null;
    
    // Initialize with defaults
    this.config = { ...this.defaults };
    
    // Load from environment variables
    this.loadFromEnvironment();
    
    // Load from file if configured
    if (this.configPath) {
      this.loadFromFile();
    }
    
    logger.info(`Configuration initialized for environment: ${this.environment}`);
  }
  
  /**
   * Load configuration from environment variables
   * Environment variables prefixed with CONFIG_ will be used to override configuration
   */
  private loadFromEnvironment(): void {
    // Get all environment variables that start with CONFIG_
    const envVars = Object.keys(process.env)
      .filter(key => key.startsWith('CONFIG_'));
    
    for (const key of envVars) {
      // Remove the CONFIG_ prefix and convert to lowercase
      const configKey = key.replace('CONFIG_', '').toLowerCase();
      
      // Split by double underscore to represent nested objects
      const parts = configKey.split('__');
      
      // Convert to nested object path
      const path = parts.join('.');
      
      // Get the value and convert to appropriate type
      const value = process.env[key];
      const parsedValue = this.parseValue(value as string);
      
      // Set the value in the config
      this.setNestedValue(this.config, path, parsedValue);
    }
  }
  
  /**
   * Load configuration from file
   */
  private loadFromFile(): void {
    if (!this.configPath) {
      return;
    }
    
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const fileConfig = JSON.parse(configData);
        
        // Merge file config into the current config
        this.config = this.deepMerge(this.config, fileConfig);
        logger.info(`Configuration loaded from ${this.configPath}`);
      }
    } catch (error) {
      logger.warn(`Failed to load configuration from ${this.configPath}:`, error);
    }
  }
  
  /**
   * Save configuration to file
   */
  public saveToFile(): void {
    if (!this.configPath) {
      logger.warn('Cannot save configuration: No config file path specified');
      return;
    }
    
    try {
      const dirPath = path.dirname(this.configPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Write config to file
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      
      logger.info(`Configuration saved to ${this.configPath}`);
    } catch (error) {
      logger.error(`Failed to save configuration to ${this.configPath}:`, error);
    }
  }
  
  /**
   * Get a configuration value
   */
  public get<T>(key: string, defaultValue?: T): T {
    const value = this.getNestedValue(this.config, key);
    return value !== undefined ? value as T : (defaultValue as T);
  }
  
  /**
   * Set a configuration value
   */
  public set(key: string, value: any, saveToFile: boolean = false): void {
    this.setNestedValue(this.config, key, value);
    logger.debug(`Configuration updated: ${key} = ${JSON.stringify(value)}`);
    
    if (saveToFile) {
      this.saveToFile();
    }
  }
  
  /**
   * Validate the entire configuration against a validation schema
   */
  public validate(schema: Record<string, any>): ConfigValidationResult {
    try {
      // Create a Zod schema from the provided schema
      const zodSchema = z.object(schema);
      
      // Validate the config
      zodSchema.parse(this.config);
      
      return { valid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')} - ${err.message}`)
        };
      }
      
      return {
        valid: false,
        errors: [`Unknown validation error: ${(error as Error).message}`]
      };
    }
  }
  
  /**
   * Get a nested configuration value using dot notation
   */
  private getNestedValue(obj: Record<string, any>, key: string): any {
    const parts = key.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set a nested configuration value using dot notation
   */
  private setNestedValue(obj: Record<string, any>, key: string, value: any): void {
    const parts = key.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  /**
   * Deep merge two objects
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], source[key]);
        } else {
          result[key] = { ...source[key] };
        }
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  /**
   * Parse a string value to its appropriate type
   */
  private parseValue(value: string): any {
    // Try to parse as a number
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }
    
    // Try to parse as a boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // Not a valid JSON, return as is
      return value;
    }
  }
  
  /**
   * Get the entire configuration
   */
  public getAll(): Record<string, any> {
    return { ...this.config };
  }
  
  /**
   * Reset configuration to defaults
   */
  public reset(saveToFile: boolean = false): void {
    this.config = { ...this.defaults };
    logger.info('Configuration reset to defaults');
    
    if (saveToFile) {
      this.saveToFile();
    }
  }
  
  /**
   * Get environment-specific configuration
   */
  public getForEnvironment(environment?: string): Record<string, any> {
    const env = environment || this.environment;
    return this.config[env] || {};
  }
}

// Export a singleton instance with default configuration
export const configManager = new ConfigManager(defaultConfig, 'config/app-config.json');