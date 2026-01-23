/**
 * useChat Hook
 * Custom hook for managing chat functionality
 * @module hooks/useChat
 */

import { useState, useEffect, useCallback } from 'react';
import { API, type ChatResponse } from '../services/api';
import type { Message } from '../components/MessageBubble';

interface UseChatOptions {
  userId?: string;
  onError?: (error: Error) => void;
  onMessageSent?: (message: Message) => void;
}

/**
 * Custom hook for chat functionality
 * Manages messages, session, loading state, and API calls
 */
export function useChat(options: UseChatOptions = {}) {
  const {
    userId = localStorage.getItem('userId') || 'anonymous',
    onError,
    onMessageSent,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  /**
   * Send message to chat API
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;

      const userMessage: Message = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      // Add user message to UI immediately
      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      try {
        const data: ChatResponse = await API.sendChatMessage({
          message: userMessage.content,
          sessionId: sessionId || undefined,
          userId: userId,
        });

        // Update session ID if returned
        if (data.sessionId && data.sessionId !== sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem('chatSessionId', data.sessionId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          dataSources: data.dataSources,
          reasoningSteps: data.reasoningSteps,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Callback for message sent
        if (onMessageSent) {
          onMessageSent(assistantMessage);
        }
      } catch (err: any) {
        console.error('Chat error:', err);
        const errorMessage = err.message || 'Failed to send message. Please try again.';
        setError(errorMessage);

        // Add error message to chat
        const errorMessageObj: Message = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessageObj]);

        // Call error callback
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [userId, sessionId, loading, onError, onMessageSent]
  );

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem('chatSessionId');
    setError(null);
  }, []);

  /**
   * Regenerate last response
   */
  const regenerateResponse = useCallback(async () => {
    if (messages.length === 0) return;

    // Find last user message
    const lastUserMessageIndex = messages
      .map((m, idx) => (m.role === 'user' ? idx : -1))
      .filter((idx) => idx !== -1)
      .pop();

    if (lastUserMessageIndex === undefined) return;

    // Remove last assistant message if exists
    const newMessages = messages.slice(0, lastUserMessageIndex + 1);
    setMessages(newMessages);

    // Resend last user message
    const lastUserMessage = messages[lastUserMessageIndex];
    await sendMessage(lastUserMessage.content);
  }, [messages, sendMessage]);

  /**
   * Export chat history
   */
  const exportChatHistory = useCallback(() => {
    const chatData = {
      sessionId,
      exportedAt: new Date().toISOString(),
      messages,
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${sessionId || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sessionId, messages]);

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    clearConversation,
    regenerateResponse,
    exportChatHistory,
    setError, // Allow manual error clearing
  };
}
