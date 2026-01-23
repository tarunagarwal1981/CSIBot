/**
 * Claude AI Client
 * Wrapper for Anthropic's Claude API with retry logic, streaming, and structured output
 * @module services/ai/claudeClient
 */

import Anthropic from '@anthropic-ai/sdk';
import { getEnvironmentConfig } from '../../config/environment';

/**
 * Request interface for Claude API
 */
export interface ClaudeRequest {
  /** Array of conversation messages */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Maximum tokens in response (default: 4000) */
  maxTokens?: number;
  /** Temperature for response randomness (0-1, default: 0.7) */
  temperature?: number;
  /** Stop sequences to end generation */
  stopSequences?: string[];
}

/**
 * Response interface from Claude API
 */
export interface ClaudeResponse {
  /** Generated content text */
  content: string;
  /** Reason for stopping generation */
  stopReason: string;
  /** Token usage statistics */
  usage: {
    /** Input tokens used */
    inputTokens: number;
    /** Output tokens used */
    outputTokens: number;
  };
}

/**
 * Claude API Client wrapper
 * Provides retry logic, streaming, and structured output capabilities
 */
export class ClaudeClient {
  private client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;
  private readonly maxRetries: number = 3;
  private readonly initialRetryDelay: number = 1000; // 1 second

  /**
   * Creates a new Claude client instance
   * @param apiKey Anthropic API key (if not provided, uses environment config)
   */
  constructor(apiKey?: string) {
    const config = getEnvironmentConfig();
    const key = apiKey || config.ANTHROPIC_API_KEY;

    if (!key) {
      throw new Error(
        'Anthropic API key is required. Set ANTHROPIC_API_KEY in environment or pass as parameter.'
      );
    }

    this.client = new Anthropic({
      apiKey: key,
    });

    this.model = config.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
    this.defaultMaxTokens = config.MAX_TOKENS_PER_REQUEST || 4000;
  }

  /**
   * Complete a single message request
   * @param request Claude request parameters
   * @returns Claude response with content and usage stats
   */
  async complete(request: ClaudeRequest): Promise<ClaudeResponse> {
    return this.retry(async () => {
      const maxTokens = request.maxTokens || this.defaultMaxTokens;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: request.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stop_sequences: request.stopSequences,
      });

      // Extract text content from response
      const textContent = response.content.find(
        (block) => block.type === 'text'
      ) as Anthropic.Messages.TextBlock | undefined;

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      return {
        content: textContent.text,
        stopReason: response.stop_reason || 'unknown',
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    }, this.maxRetries);
  }

  /**
   * Stream completion response
   * Yields chunks of text as they are generated
   * @param request Claude request parameters
   * @returns Async generator yielding text chunks
   */
  async *streamComplete(request: ClaudeRequest): AsyncGenerator<string> {
    const maxTokens = request.maxTokens || this.defaultMaxTokens;

    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.7,
        system: request.systemPrompt,
        messages: request.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stop_sequences: request.stopSequences,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error: any) {
      console.error('Claude streaming error:', error);
      throw new Error(`Claude streaming failed: ${error.message}`);
    }
  }

  /**
   * Complete request with structured JSON output
   * Uses Claude's structured output capabilities
   * @param request Claude request parameters
   * @param schema JSON schema for structured output
   * @returns Parsed JSON object of type T
   */
  async completeJSON<T>(
    request: ClaudeRequest,
    _schema?: unknown
  ): Promise<T> {
    return this.retry(async () => {
      const maxTokens = request.maxTokens || this.defaultMaxTokens;

      // Enhance system prompt to request JSON output
      const enhancedSystemPrompt = request.systemPrompt
        ? `${request.systemPrompt}\n\nRespond with valid JSON matching the provided schema.`
        : 'Respond with valid JSON matching the provided schema.';

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature: request.temperature ?? 0.3, // Lower temperature for structured output
        system: enhancedSystemPrompt,
        messages: request.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stop_sequences: request.stopSequences,
      });

      // Extract text content
      const textContent = response.content.find(
        (block) => block.type === 'text'
      ) as Anthropic.Messages.TextBlock | undefined;

      if (!textContent) {
        throw new Error('No text content in Claude response');
      }

      // Parse JSON response
      try {
        // Try to extract JSON from markdown code blocks if present
        let jsonText = textContent.text.trim();
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim();
        }

        return JSON.parse(jsonText) as T;
      } catch (parseError: any) {
        console.error('Failed to parse JSON response:', textContent.text);
        throw new Error(`Invalid JSON response from Claude: ${parseError.message}`);
      }
    }, this.maxRetries);
  }

  /**
   * Retry logic with exponential backoff
   * Retries failed requests up to maxRetries times
   * @param fn Function to retry
   * @param maxRetries Maximum number of retry attempts
   * @returns Result of the function
   */
  private async retry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = this.initialRetryDelay * Math.pow(2, attempt);
        console.warn(
          `Claude API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
          error.message
        );

        await this.sleep(delay);
      }
    }

    throw new Error(
      `Claude API request failed after ${maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Determines if an error should not be retried
   * @param error Error object
   * @returns true if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors
    if (error.status === 401 || error.status === 403) {
      return true;
    }

    // Don't retry on bad request errors (4xx except rate limit)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return true;
    }

    return false;
  }

  /**
   * Estimate token count for text
   * Approximate token counting (rough estimate: 1 token ≈ 4 characters)
   * @param text Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    if (!text) return 0;

    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified approximation
    const charCount = text.length;
    const estimatedTokens = Math.ceil(charCount / 4);

    return estimatedTokens;
  }

  /**
   * Estimate tokens for messages array
   * @param messages Array of messages
   * @returns Total estimated token count
   */
  estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg.content) + 4; // +4 for role overhead
    }, 0);
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current model being used
   * @returns Model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Check if API key is valid
   * Makes a simple API call to verify credentials
   * @returns true if API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch (error: any) {
      if (error.status === 401 || error.status === 403) {
        return false;
      }
      // Other errors might be transient, consider key valid
      return true;
    }
  }
}
