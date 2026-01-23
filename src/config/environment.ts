/**
 * Environment configuration management
 * Loads and validates environment variables with sensible defaults
 * @module config/environment
 */

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  // Database
  /** PostgreSQL database host */
  DB_HOST: string;
  /** PostgreSQL database port */
  DB_PORT: number;
  /** PostgreSQL database name */
  DB_NAME: string;
  /** PostgreSQL database user */
  DB_USER: string;
  /** PostgreSQL database password */
  DB_PASSWORD: string;
  /** Enable SSL for database connections */
  DB_SSL: boolean;
  /** PostgreSQL schema name (default: 'public') */
  DB_SCHEMA: string;

  // Claude API
  /** Anthropic API key for Claude */
  ANTHROPIC_API_KEY: string;
  /** Claude model to use */
  CLAUDE_MODEL: string;

  // Application
  /** Node environment */
  NODE_ENV: 'development' | 'production' | 'test';
  /** API base URL */
  API_URL: string;

  // Feature Flags
  /** Enable AI summary generation */
  ENABLE_SUMMARY_GENERATION: boolean;
  /** Enable risk detection features */
  ENABLE_RISK_DETECTION: boolean;
  /** Days until summary refresh is required */
  SUMMARY_REFRESH_DAYS: number;

  // Rate Limiting
  /** Maximum tokens per request */
  MAX_TOKENS_PER_REQUEST: number;
  /** Maximum requests per minute */
  MAX_REQUESTS_PER_MINUTE: number;
}

/**
 * Default values for environment variables
 */
const DEFAULT_CONFIG: Partial<EnvironmentConfig> = {
  DB_PORT: 5432,
  DB_SSL: true,
  DB_SCHEMA: 'public',
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  NODE_ENV: 'development',
  API_URL: 'http://localhost:3000',
  ENABLE_SUMMARY_GENERATION: true,
  ENABLE_RISK_DETECTION: true,
  SUMMARY_REFRESH_DAYS: 15,
  MAX_TOKENS_PER_REQUEST: 4000,
  MAX_REQUESTS_PER_MINUTE: 20,
};

/**
 * Required environment variables that must be set
 */
const REQUIRED_VARS: (keyof EnvironmentConfig)[] = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'ANTHROPIC_API_KEY',
];

/**
 * Cached environment configuration
 */
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Parses a string to a boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  const lower = value.toLowerCase().trim();
  return lower === 'true' || lower === '1' || lower === 'yes';
}

/**
 * Parses a string to a number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`Invalid number value: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

/**
 * Validates NODE_ENV value
 */
function parseNodeEnv(value: string | undefined): 'development' | 'production' | 'test' {
  const env = (value || 'development').toLowerCase();
  if (env === 'development' || env === 'production' || env === 'test') {
    return env;
  }
  console.warn(`Invalid NODE_ENV: ${value}, defaulting to 'development'`);
  return 'development';
}

/**
 * Gets the environment configuration
 * Caches the result for subsequent calls
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config: EnvironmentConfig = {
    // Database
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: parseNumber(process.env.DB_PORT, DEFAULT_CONFIG.DB_PORT!),
    DB_NAME: process.env.DB_NAME || '',
    DB_USER: process.env.DB_USER || '',
    // Handle password - strip surrounding quotes but preserve spaces and special characters
    // dotenv handles quoted values, but we strip quotes to be safe
    DB_PASSWORD: (process.env.DB_PASSWORD || '').replace(/^["']|["']$/g, ''),
    DB_SSL: parseBoolean(process.env.DB_SSL, DEFAULT_CONFIG.DB_SSL!),
    DB_SCHEMA: process.env.DB_SCHEMA || DEFAULT_CONFIG.DB_SCHEMA!,

    // Claude API
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || DEFAULT_CONFIG.CLAUDE_MODEL!,

    // Application
    NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
    API_URL: process.env.API_URL || DEFAULT_CONFIG.API_URL!,

    // Feature Flags
    ENABLE_SUMMARY_GENERATION: parseBoolean(
      process.env.ENABLE_SUMMARY_GENERATION,
      DEFAULT_CONFIG.ENABLE_SUMMARY_GENERATION!
    ),
    ENABLE_RISK_DETECTION: parseBoolean(
      process.env.ENABLE_RISK_DETECTION,
      DEFAULT_CONFIG.ENABLE_RISK_DETECTION!
    ),
    SUMMARY_REFRESH_DAYS: parseNumber(
      process.env.SUMMARY_REFRESH_DAYS,
      DEFAULT_CONFIG.SUMMARY_REFRESH_DAYS!
    ),

    // Rate Limiting
    MAX_TOKENS_PER_REQUEST: parseNumber(
      process.env.MAX_TOKENS_PER_REQUEST,
      DEFAULT_CONFIG.MAX_TOKENS_PER_REQUEST!
    ),
    MAX_REQUESTS_PER_MINUTE: parseNumber(
      process.env.MAX_REQUESTS_PER_MINUTE,
      DEFAULT_CONFIG.MAX_REQUESTS_PER_MINUTE!
    ),
  };

  cachedConfig = config;
  return config;
}

/**
 * Validates that all required environment variables are present
 * Throws descriptive errors if critical variables are missing
 */
export function validateEnvironment(): void {
  const config = getEnvironmentConfig();
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    const value = config[key];
    if (value === undefined || value === null || value === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `
Missing required environment variables:
${missing.map((key) => `  - ${key}`).join('\n')}

Please set these variables in your .env file or environment.
See .env.example for reference.
    `.trim();

    throw new Error(errorMessage);
  }

  // Additional validation
  if (config.DB_PORT < 1 || config.DB_PORT > 65535) {
    throw new Error(`Invalid DB_PORT: ${config.DB_PORT}. Must be between 1 and 65535.`);
  }

  if (config.SUMMARY_REFRESH_DAYS < 1) {
    throw new Error(`Invalid SUMMARY_REFRESH_DAYS: ${config.SUMMARY_REFRESH_DAYS}. Must be at least 1.`);
  }

  if (config.MAX_TOKENS_PER_REQUEST < 1) {
    throw new Error(`Invalid MAX_TOKENS_PER_REQUEST: ${config.MAX_TOKENS_PER_REQUEST}. Must be at least 1.`);
  }

  if (config.MAX_REQUESTS_PER_MINUTE < 1) {
    throw new Error(`Invalid MAX_REQUESTS_PER_MINUTE: ${config.MAX_REQUESTS_PER_MINUTE}. Must be at least 1.`);
  }
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
