import { defineFunction } from '@aws-amplify/backend';

export const calculateKPIsFunction = defineFunction({
  name: 'calculate-kpis',
  entry: './handler.ts',
  timeoutSeconds: 180, // 3 minutes for batch calculations
  memoryMB: 1024,
  environment: {
    // Database
    DB_HOST: process.env.DB_HOST || '',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_NAME: process.env.DB_NAME || '',
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_SSL: process.env.DB_SSL || 'true',

    // Application
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
});
