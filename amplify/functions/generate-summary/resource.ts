import { defineFunction } from '@aws-amplify/backend';

export const generateSummaryFunction = defineFunction({
  name: 'generate-summary',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for batch operations
  memoryMB: 1024,
  environment: {
    // Database
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME || '',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_SSL: process.env.DB_SSL || 'true',

    // Claude API
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',

    // Application
    NODE_ENV: process.env.NODE_ENV || 'production',

    // Feature Flags
    ENABLE_SUMMARY_GENERATION: process.env.ENABLE_SUMMARY_GENERATION || 'true',
    SUMMARY_REFRESH_DAYS: process.env.SUMMARY_REFRESH_DAYS || '15',

    // Rate Limiting
    MAX_TOKENS_PER_REQUEST: process.env.MAX_TOKENS_PER_REQUEST || '4000',
  },
});
