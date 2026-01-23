/**
 * Generate Summary Function Handler
 * Scheduled and manual summary generation for crew performance
 * @module functions/generate-summary/handler
 */

import type { Handler } from 'aws-lambda';
import { ClaudeClient } from '../../../src/services/ai/claudeClient';
import { AIOrchestrator } from '../../../src/services/ai/orchestrator';
import { SummaryRepository } from '../../../src/services/database/repositories/summaryRepository';
import { CrewRepository } from '../../../src/services/database/repositories/crewRepository';
import { DatabaseConnection } from '../../../src/services/database/connection';

interface GenerateSummaryRequest {
  seafarerId?: number; // If provided, generate for specific crew
  batchMode?: boolean; // If true, generate for all crew needing refresh
  refreshDays?: number; // Override default 15 days
}

/**
 * Lambda handler for summary generation
 * Can be triggered manually via API or scheduled via EventBridge
 */
export const handler: Handler = async (event: any) => {
  try {
    // Handle EventBridge scheduled events
    let body: GenerateSummaryRequest = {};
    
    if (event.body) {
      // API Gateway event
      body = JSON.parse(event.body);
    } else if (event.source === 'aws.events') {
      // EventBridge scheduled event - run in batch mode
      body = { batchMode: true };
    } else {
      // Direct invocation or other event types
      body = event as GenerateSummaryRequest;
    }

    const { seafarerId, batchMode, refreshDays = 15 } = body;

    // Initialize AI orchestrator
    const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY);
    const orchestrator = new AIOrchestrator(claudeClient);

    // Determine which crew members need summaries
    let seafarerIds: number[] = [];

    if (seafarerId) {
      // Generate for specific crew
      seafarerIds = [seafarerId];
    } else if (batchMode) {
      // Generate for all crew needing refresh
      seafarerIds = await CrewRepository.getCrewNeedingSummaryRefresh();
      console.log(
        `Found ${seafarerIds.length} crew members needing summary refresh`
      );
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Must provide either seafarerId or batchMode=true',
        }),
      };
    }

    if (seafarerIds.length === 0) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: 'No crew members need summary refresh at this time',
          successCount: 0,
          failCount: 0,
          results: [],
        }),
      };
    }

    const results: Array<{
      seafarerId: number;
      success: boolean;
      summaryId?: number;
      tokensUsed?: number;
      changes?: any;
      error?: string;
    }> = [];
    let successCount = 0;
    let failCount = 0;

    // Process each crew member
    for (const id of seafarerIds) {
      try {
        // Get previous summary for comparison
        const oldSummary = await SummaryRepository.getLatestSummary(id);

        // Generate new summary (this already saves it to database)
        const { summary, tokensUsed } =
          await orchestrator.generatePerformanceSummary(id);

        // Detect changes if previous summary exists
        let changes = null;
        if (oldSummary) {
          try {
            changes = await SummaryRepository.compareSummaries(
              oldSummary.id,
              summary.id
            );
          } catch (compareError) {
            console.warn(
              `Failed to compare summaries for seafarer ${id}:`,
              compareError
            );
          }
        }

        results.push({
          seafarerId: id,
          success: true,
          summaryId: summary.id,
          tokensUsed,
          changes,
        });

        successCount++;

        // Rate limiting: pause between API calls to avoid overwhelming Claude API
        if (seafarerIds.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.error(`Failed to generate summary for seafarer ${id}:`, error);
        results.push({
          seafarerId: id,
          success: false,
          error: error.message || 'Unknown error',
        });
        failCount++;
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        message: `Generated summaries for ${successCount} crew members`,
        successCount,
        failCount,
        totalProcessed: seafarerIds.length,
        results: batchMode && seafarerIds.length > 10 ? undefined : results, // Only return details for small batches
      }),
    };
  } catch (error: any) {
    console.error('Summary generation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    };
  } finally {
    // Close DB connections
    try {
      await DatabaseConnection.closePool();
    } catch (closeError) {
      console.error('Error closing database pool:', closeError);
    }
  }
};

/**
 * CORS headers for API responses
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
