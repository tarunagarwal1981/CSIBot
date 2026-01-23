import { defineFunction } from '@aws-amplify/backend';

export const chatFunction = defineFunction({
  name: 'chat',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 1024,
  environment: {
    // Database
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME || '',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_SSL: process.env.DB_SSL || 'true',
    DB_SCHEMA: process.env.DB_SCHEMA || 'public',

    // Claude API
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',

    // Application
    NODE_ENV: process.env.NODE_ENV || 'production',
    API_URL: process.env.API_URL || '',

    // Feature Flags
    ENABLE_SUMMARY_GENERATION: process.env.ENABLE_SUMMARY_GENERATION || 'true',
    ENABLE_RISK_DETECTION: process.env.ENABLE_RISK_DETECTION || 'true',
    SUMMARY_REFRESH_DAYS: process.env.SUMMARY_REFRESH_DAYS || '15',

    // Rate Limiting
    MAX_TOKENS_PER_REQUEST: process.env.MAX_TOKENS_PER_REQUEST || '4000',
    MAX_REQUESTS_PER_MINUTE: process.env.MAX_REQUESTS_PER_MINUTE || '20',
  },
});
