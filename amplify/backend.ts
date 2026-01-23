/**
 * Amplify Backend Configuration
 * Ties together all backend resources: functions, auth, and data
 * @module amplify/backend
 */

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { chatFunction } from './functions/chat/resource';
import { generateSummaryFunction } from './functions/generate-summary/resource';
import { calculateKPIsFunction } from './functions/calculate-kpis/resource';

/**
 * Define the backend with all resources
 */
export const backend = defineBackend({
  auth,
  data,
  chatFunction,
  generateSummaryFunction,
  calculateKPIsFunction,
});

/**
 * Configure API Gateway CORS for all functions
 * Note: In Amplify Gen 2, CORS is typically configured at the API Gateway level
 * This ensures all functions have proper CORS headers
 */
// Add CORS environment variable for reference (handlers use this)
backend.chatFunction.resources.lambda.addEnvironment('CORS_ALLOW_ORIGIN', '*');
backend.generateSummaryFunction.resources.lambda.addEnvironment('CORS_ALLOW_ORIGIN', '*');
backend.calculateKPIsFunction.resources.lambda.addEnvironment('CORS_ALLOW_ORIGIN', '*');

/**
 * Configure scheduled trigger for summary generation
 * Runs daily at 2 AM UTC to generate summaries for crew needing refresh
 * 
 * Note: In Amplify Gen 2, scheduled functions are configured using EventBridge rules
 * This creates a rule that triggers the generate-summary function daily
 */
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

// Create EventBridge rule for daily summary generation
const summaryRule = new Rule(
  backend.generateSummaryFunction.resources.lambda.stack,
  'DailySummaryGenerationRule',
  {
    ruleName: 'crew-performance-daily-summary',
    description: 'Triggers daily summary generation for crew members needing refresh',
    schedule: Schedule.cron({
      hour: '2',
      minute: '0',
      day: '*',
      month: '*',
      year: '*',
    }),
  }
);

// Add the Lambda function as a target
summaryRule.addTarget(
  new LambdaFunction(backend.generateSummaryFunction.resources.lambda, {
    event: JSON.stringify({
      source: 'aws.events',
      batchMode: true,
      refreshDays: 15,
    }),
  })
);

// Grant EventBridge permission to invoke the Lambda
backend.generateSummaryFunction.resources.lambda.addPermission('AllowEventBridgeInvoke', {
  principal: 'events.amazonaws.com',
  sourceArn: summaryRule.ruleArn,
});
