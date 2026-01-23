/**
 * Chat Function Handler
 * Main chatbot endpoint for handling user queries
 * @module functions/chat/handler
 */

import type { Handler } from 'aws-lambda';
import { ClaudeClient } from '../../../src/services/ai/claudeClient';
import { AIOrchestrator } from '../../../src/services/ai/orchestrator';
import { ChatRepository } from '../../../src/services/database/repositories/chatRepository';
import { DatabaseConnection } from '../../../src/services/database/connection';

interface ChatRequest {
  message: string;
  sessionId?: string;
  userId: string;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  dataSources?: Array<{ kpi: string; value: any; table: string }>;
  reasoningSteps?: string[];
  tokensUsed: number;
  timestamp: string;
}

/**
 * Lambda handler for chat function
 */
export const handler: Handler = async (event: any) => {
  try {
    // 1. Parse request
    const body: ChatRequest = JSON.parse(event.body || '{}');
    const { message, sessionId, userId } = body;

    // Validation
    if (!message || !userId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Missing required fields: message, userId',
        }),
      };
    }

    // 2. Get or create session
    let session = sessionId;
    if (!session) {
      session = await ChatRepository.createSession(userId);
    } else {
      const existingSession = await ChatRepository.getSession(session);
      if (!existingSession) {
        session = await ChatRepository.createSession(userId);
      }
    }

    // 3. Save user message
    await ChatRepository.saveMessage({
      session_id: session,
      role: 'user',
      content: message,
      reasoning_steps: null,
      data_sources: null,
      tokens_used: 0,
    });

    // 4. Initialize AI orchestrator
    const claudeClient = new ClaudeClient(process.env.ANTHROPIC_API_KEY);
    const orchestrator = new AIOrchestrator(claudeClient);

    // 5. Process query with Claude
    const result = await orchestrator.handleChatQuery(message, session);

    // 6. Save assistant response
    await ChatRepository.saveMessage({
      session_id: session,
      role: 'assistant',
      content: result.response,
      reasoning_steps: result.reasoningSteps,
      data_sources: result.dataSources,
      tokens_used: result.tokensUsed,
    });

    // Note: Session stats are automatically updated by saveMessage()

    // 8. Return response
    const response: ChatResponse = {
      response: result.response,
      sessionId: session,
      dataSources: result.dataSources,
      reasoningSteps: result.reasoningSteps,
      tokensUsed: result.tokensUsed,
      timestamp: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(response),
    };
  } catch (error: any) {
    console.error('Chat handler error:', error);
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
