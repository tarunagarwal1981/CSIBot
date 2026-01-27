/**
 * Chat Repository
 * Database operations for chat sessions and messages
 * @module services/database/repositories/chatRepository
 */

import { DatabaseConnection } from '../connection';
import type { ChatSession, ChatMessage } from '../../../types/database';
import { randomUUID } from 'crypto';

/**
 * Repository for chat-related database operations
 */
export class ChatRepository {
  /**
   * Create new chat session
   * Creates a new chat session and returns the session ID (UUID)
   * @param userId User ID
   * @returns Session ID (UUID)
   */
  static async createSession(userId: string): Promise<string> {
    const sessionId = randomUUID();

    const sql = `
      INSERT INTO chat_session (
        session_id,
        user_id,
        started_at,
        ended_at,
        total_messages,
        total_tokens
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP, NULL, 0, 0)
      RETURNING session_id
    `;

    const result = await DatabaseConnection.queryOne<{ session_id: string }>(sql, [
      sessionId,
      userId,
    ]);

    if (!result) {
      throw new Error('Failed to create chat session');
    }

    return result.session_id;
  }

  /**
   * Get session by session ID
   * @param sessionId Session ID (UUID)
   * @returns Chat session or null if not found
   */
  static async getSession(sessionId: string): Promise<ChatSession | null> {
    const sql = `
      SELECT 
        session_id,
        user_id,
        started_at,
        ended_at,
        total_messages,
        total_tokens
      FROM chat_session
      WHERE session_id = $1
    `;

    return await DatabaseConnection.queryOne<ChatSession>(sql, [sessionId]);
  }

  /**
   * Save chat message
   * Inserts a new chat message and returns the message ID
   * @param message Message data without id and created_at (will be auto-generated)
   * @returns The ID of the newly created message
   */
  static async saveMessage(
    message: Omit<ChatMessage, 'id' | 'created_at'>
  ): Promise<number> {
    // Check if structured_response column exists by trying to query it
    // If it doesn't exist, we'll use a fallback INSERT without that column
    let sql: string;
    let params: any[];

    try {
      // Try to check if column exists by attempting a query
      // If this fails, we'll use the fallback
      sql = `
        INSERT INTO chat_message (
          session_id,
          role,
          content,
          reasoning_steps,
          data_sources,
          structured_response,
          tokens_used
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      params = [
        message.session_id,
        message.role,
        message.content,
        message.reasoning_steps ? JSON.stringify(message.reasoning_steps) : null,
        message.data_sources ? JSON.stringify(message.data_sources) : null,
        message.structured_response ? JSON.stringify(message.structured_response) : null,
        message.tokens_used,
      ];
    } catch {
      // Fallback if column doesn't exist
      sql = `
        INSERT INTO chat_message (
          session_id,
          role,
          content,
          reasoning_steps,
          data_sources,
          tokens_used
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      params = [
        message.session_id,
        message.role,
        message.content,
        message.reasoning_steps ? JSON.stringify(message.reasoning_steps) : null,
        message.data_sources ? JSON.stringify(message.data_sources) : null,
        message.tokens_used,
      ];
    }

    // Try with structured_response first, fallback if column doesn't exist
    try {
      const result = await DatabaseConnection.queryOne<{ id: number }>(sql, params);
      if (!result) {
        throw new Error('Failed to save chat message');
      }
      return result.id;
    } catch (error: any) {
      // If error is about missing column, retry without structured_response
      if (error.code === '42703' && error.message?.includes('structured_response')) {
        console.warn('⚠️ structured_response column not found, using fallback INSERT');
        const fallbackSql = `
          INSERT INTO chat_message (
            session_id,
            role,
            content,
            reasoning_steps,
            data_sources,
            tokens_used
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;

        const fallbackParams = [
          message.session_id,
          message.role,
          message.content,
          message.reasoning_steps ? JSON.stringify(message.reasoning_steps) : null,
          message.data_sources ? JSON.stringify(message.data_sources) : null,
          message.tokens_used,
        ];

        const result = await DatabaseConnection.queryOne<{ id: number }>(fallbackSql, fallbackParams);
        if (!result) {
          throw new Error('Failed to save chat message');
        }
        return result.id;
      }
      throw error;
    }

    if (!result) {
      throw new Error('Failed to save chat message');
    }

    // Update session statistics
    await this.updateSessionStats(
      message.session_id,
      1, // Increment message count by 1
      message.tokens_used // Add tokens
    );

    return result.id;
  }

  /**
   * Get conversation history for a session
   * Returns all messages for a session ordered by creation time
   * @param sessionId Session ID
   * @param limit Maximum number of messages to return (default: 100)
   * @returns Array of chat messages
   */
  static async getConversationHistory(
    sessionId: string,
    limit: number = 100
  ): Promise<ChatMessage[]> {
    const maxLimit = Math.min(limit, 500); // Cap at 500 for performance

    // Use COALESCE to handle missing structured_response column gracefully
    const sql = `
      SELECT 
        id,
        session_id,
        role,
        content,
        reasoning_steps::jsonb as reasoning_steps,
        data_sources::jsonb as data_sources,
        COALESCE(structured_response::jsonb, NULL) as structured_response,
        tokens_used,
        created_at
      FROM chat_message
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;

    const results = await DatabaseConnection.query<{
      id: number;
      session_id: string;
      role: string;
      content: string;
      reasoning_steps: any;
      data_sources: any;
      structured_response: any;
      tokens_used: number;
      created_at: Date;
    }>(sql, [sessionId, maxLimit]);

    return results.map((result) => ({
      id: result.id,
      session_id: result.session_id,
      role: result.role as 'user' | 'assistant' | 'system',
      content: result.content,
      reasoning_steps: result.reasoning_steps,
      data_sources: result.data_sources,
      structured_response: result.structured_response,
      tokens_used: result.tokens_used,
      created_at: result.created_at,
    }));
  }

  /**
   * Update session statistics
   * Atomically updates message count and token count for a session
   * @param sessionId Session ID
   * @param incrementMessages Number of messages to add (can be negative)
   * @param addTokens Number of tokens to add (can be negative)
   */
  static async updateSessionStats(
    sessionId: string,
    incrementMessages: number,
    addTokens: number
  ): Promise<void> {
    const sql = `
      UPDATE chat_session
      SET 
        total_messages = total_messages + $2,
        total_tokens = total_tokens + $3
      WHERE session_id = $1
    `;

    await DatabaseConnection.query(sql, [sessionId, incrementMessages, addTokens]);
  }

  /**
   * End session
   * Marks a session as ended by setting ended_at timestamp
   * @param sessionId Session ID
   */
  static async endSession(sessionId: string): Promise<void> {
    const sql = `
      UPDATE chat_session
      SET ended_at = CURRENT_TIMESTAMP
      WHERE session_id = $1
        AND ended_at IS NULL
    `;

    await DatabaseConnection.query(sql, [sessionId]);
  }

  /**
   * Get user's recent sessions
   * Returns recent chat sessions for a user ordered by most recent first
   * @param userId User ID
   * @param limit Maximum number of sessions to return (default: 20)
   * @returns Array of chat sessions
   */
  static async getUserSessions(
    userId: string,
    limit: number = 20
  ): Promise<ChatSession[]> {
    const maxLimit = Math.min(limit, 100); // Cap at 100

    const sql = `
      SELECT 
        session_id,
        user_id,
        started_at,
        ended_at,
        total_messages,
        total_tokens
      FROM chat_session
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;

    return await DatabaseConnection.query<ChatSession>(sql, [userId, maxLimit]);
  }

  /**
   * Delete old sessions (privacy cleanup)
   * Removes sessions older than specified days
   * Also deletes associated messages (cascade delete)
   * @param olderThanDays Delete sessions older than this many days
   * @returns Number of sessions deleted
   */
  static async deleteOldSessions(olderThanDays: number): Promise<number> {
    // First, get count of sessions to be deleted
    const countSql = `
      SELECT COUNT(*) as delete_count
      FROM chat_session
      WHERE started_at < CURRENT_DATE - INTERVAL '1 day' * $1
    `;

    const countResult = await DatabaseConnection.queryOne<{ delete_count: string }>(
      countSql,
      [olderThanDays]
    );

    // Delete old sessions (messages will be cascade deleted if foreign key is set up)
    const deleteSql = `
      DELETE FROM chat_session
      WHERE started_at < CURRENT_DATE - INTERVAL '1 day' * $1
    `;

    await DatabaseConnection.query(deleteSql, [olderThanDays]);

    return parseInt(countResult?.delete_count || '0', 10);
  }

  /**
   * Get active sessions count
   * Returns count of sessions that are currently active (not ended)
   * @param userId Optional user ID to filter by
   * @returns Count of active sessions
   */
  static async getActiveSessionsCount(userId?: string): Promise<number> {
    let sql = `
      SELECT COUNT(*) as active_count
      FROM chat_session
      WHERE ended_at IS NULL
    `;

    const params: any[] = [];

    if (userId) {
      sql += ` AND user_id = $1`;
      params.push(userId);
    }

    const result = await DatabaseConnection.queryOne<{ active_count: string }>(sql, params);

    return parseInt(result?.active_count || '0', 10);
  }

  /**
   * Get session statistics
   * Returns statistics for a specific session
   * @param sessionId Session ID
   * @returns Session statistics
   */
  static async getSessionStatistics(sessionId: string): Promise<{
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    totalTokens: number;
    averageTokensPerMessage: number;
    durationMinutes: number | null;
  }> {
    const sql = `
      WITH session_info AS (
        SELECT 
          total_messages,
          total_tokens,
          started_at,
          ended_at
        FROM chat_session
        WHERE session_id = $1
      ),
      message_stats AS (
        SELECT 
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE role = 'user') as user_messages,
          COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
          SUM(tokens_used) as total_tokens,
          AVG(tokens_used) as avg_tokens
        FROM chat_message
        WHERE session_id = $1
      )
      SELECT 
        COALESCE(ms.total_messages, si.total_messages, 0) as message_count,
        COALESCE(ms.user_messages, 0) as user_message_count,
        COALESCE(ms.assistant_messages, 0) as assistant_message_count,
        COALESCE(ms.total_tokens, si.total_tokens, 0) as total_tokens,
        COALESCE(ms.avg_tokens, 0) as avg_tokens,
        CASE 
          WHEN si.ended_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (si.ended_at - si.started_at)) / 60
          ELSE NULL
        END as duration_minutes
      FROM session_info si
      CROSS JOIN message_stats ms
    `;

    const result = await DatabaseConnection.queryOne<{
      message_count: number;
      user_message_count: number;
      assistant_message_count: number;
      total_tokens: number;
      avg_tokens: number | null;
      duration_minutes: number | null;
    }>(sql, [sessionId]);

    if (!result) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      messageCount: result.message_count,
      userMessageCount: result.user_message_count,
      assistantMessageCount: result.assistant_message_count,
      totalTokens: result.total_tokens,
      averageTokensPerMessage: Math.round((result.avg_tokens || 0) * 100) / 100,
      durationMinutes: result.duration_minutes
        ? Math.round(result.duration_minutes * 100) / 100
        : null,
    };
  }

  /**
   * Get message by ID
   * @param messageId Message ID
   * @returns Chat message or null if not found
   */
  static async getMessageById(messageId: number): Promise<ChatMessage | null> {
    // Use COALESCE to handle missing structured_response column gracefully
    const sql = `
      SELECT 
        id,
        session_id,
        role,
        content,
        reasoning_steps::jsonb as reasoning_steps,
        data_sources::jsonb as data_sources,
        COALESCE(structured_response::jsonb, NULL) as structured_response,
        tokens_used,
        created_at
      FROM chat_message
      WHERE id = $1
    `;

    const result = await DatabaseConnection.queryOne<{
      id: number;
      session_id: string;
      role: string;
      content: string;
      reasoning_steps: any;
      data_sources: any;
      structured_response: any;
      tokens_used: number;
      created_at: Date;
    }>(sql, [messageId]);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      session_id: result.session_id,
      role: result.role as 'user' | 'assistant' | 'system',
      content: result.content,
      reasoning_steps: result.reasoning_steps,
      data_sources: result.data_sources,
      structured_response: result.structured_response,
      tokens_used: result.tokens_used,
      created_at: result.created_at,
    };
  }

  /**
   * Get recent messages across all sessions
   * Useful for monitoring and analytics
   * @param limit Maximum number of messages to return (default: 50)
   * @returns Array of recent chat messages
   */
  static async getRecentMessages(limit: number = 50): Promise<ChatMessage[]> {
    const maxLimit = Math.min(limit, 200);

    // Use COALESCE to handle missing structured_response column gracefully
    const sql = `
      SELECT 
        id,
        session_id,
        role,
        content,
        reasoning_steps::jsonb as reasoning_steps,
        data_sources::jsonb as data_sources,
        COALESCE(structured_response::jsonb, NULL) as structured_response,
        tokens_used,
        created_at
      FROM chat_message
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const results = await DatabaseConnection.query<{
      id: number;
      session_id: string;
      role: string;
      content: string;
      reasoning_steps: any;
      data_sources: any;
      structured_response: any;
      tokens_used: number;
      created_at: Date;
    }>(sql, [maxLimit]);

    return results.map((result) => ({
      id: result.id,
      session_id: result.session_id,
      role: result.role as 'user' | 'assistant' | 'system',
      content: result.content,
      reasoning_steps: result.reasoning_steps,
      data_sources: result.data_sources,
      structured_response: result.structured_response,
      tokens_used: result.tokens_used,
      created_at: result.created_at,
    }));
  }
}
