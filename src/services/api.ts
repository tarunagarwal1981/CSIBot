/**
 * API Service
 * Centralized API client for all frontend API calls
 * @module services/api
 */

import type { CrewMaster } from '../types/database';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * API Error class for better error handling
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Chat response interface
 */
export interface ChatResponse {
  response: string;
  sessionId: string;
  dataSources?: Array<{ kpi: string; value: any; table: string }>;
  reasoningSteps?: string[];
  tokensUsed: number;
  timestamp: string;
}

/**
 * Chat request interface
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId: string;
}

/**
 * Generate summary request interface
 */
export interface GenerateSummaryRequest {
  seafarerId?: number;
  batchMode?: boolean;
  refreshDays?: number;
}

/**
 * Generate summary response interface
 */
export interface GenerateSummaryResponse {
  message: string;
  successCount: number;
  failCount: number;
  totalProcessed: number;
  results?: Array<{
    seafarerId: number;
    success: boolean;
    summaryId?: number;
    tokensUsed?: number;
    changes?: any;
    error?: string;
  }>;
}

/**
 * Calculate KPIs request interface
 */
export interface CalculateKPIsRequest {
  seafarerId: number;
  kpiCodes?: string[];
  saveToDB?: boolean;
}

/**
 * Calculate KPIs response interface
 */
export interface CalculateKPIsResponse {
  seafarerId: number;
  kpis: Record<
    string,
    {
      value: any;
      calculated_at: string;
      unit: string | null;
      error?: string;
    }
  >;
  timestamp: string;
  savedToDB: boolean;
}

/**
 * Crew search response interface
 */
export interface CrewSearchResponse {
  results: CrewMaster[];
  total: number;
  limit: number;
}

/**
 * Crew profile response interface
 */
export interface CrewProfileResponse {
  master: CrewMaster;
  kpis: Record<string, any>;
  experience: any[];
  certifications: any[];
  recentEvents: any[];
  latestAppraisal: any | null;
  latestSummary: any | null;
}

/**
 * Generic API call wrapper with error handling
 */
async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any = null;

      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
      }

      throw new APIError(errorMessage, response.status, errorData);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    // Network or other errors
    console.error('API call failed:', error);
    throw new APIError(
      error instanceof Error ? error.message : 'Network error occurred',
      undefined,
      error
    );
  }
}

/**
 * API Service Class
 * Centralized API client for all endpoints
 */
export class API {
  /**
   * Send chat message
   */
  static async sendChatMessage(data: ChatRequest): Promise<ChatResponse> {
    return apiCall<ChatResponse>(`${API_BASE_URL}/chat`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Generate performance summary for crew member(s)
   */
  static async generateSummary(
    data: GenerateSummaryRequest
  ): Promise<GenerateSummaryResponse> {
    return apiCall<GenerateSummaryResponse>(
      `${API_BASE_URL}/generate-summary`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Calculate KPIs for a crew member
   */
  static async calculateKPIs(
    data: CalculateKPIsRequest
  ): Promise<CalculateKPIsResponse> {
    return apiCall<CalculateKPIsResponse>(`${API_BASE_URL}/calculate-kpis`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Search crew members
   */
  static async searchCrew(
    query: string,
    limit: number = 50
  ): Promise<CrewMaster[]> {
    const response = await apiCall<CrewSearchResponse>(
      `${API_BASE_URL}/crew/search`,
      {
        method: 'POST',
        body: JSON.stringify({ query, limit }),
      }
    );
    return response.results;
  }

  /**
   * Get crew member by ID
   */
  static async getCrewById(seafarerId: number): Promise<CrewMaster> {
    return apiCall<CrewMaster>(`${API_BASE_URL}/crew/${seafarerId}`, {
      method: 'GET',
    });
  }

  /**
   * Get complete crew profile with all related data
   */
  static async getCrewProfile(
    seafarerId: number
  ): Promise<CrewProfileResponse> {
    return apiCall<CrewProfileResponse>(
      `${API_BASE_URL}/crew/${seafarerId}/profile`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Get crew members by status
   */
  static async getCrewByStatus(
    status: 'atsea' | 'onleave',
    limit: number = 50
  ): Promise<CrewMaster[]> {
    const response = await apiCall<{ crew: CrewMaster[] }>(
      `${API_BASE_URL}/crew/status/${status}`,
      {
        method: 'GET',
        headers: {
          'X-Limit': limit.toString(),
        },
      }
    );
    return response.crew || [];
  }

  /**
   * Get crew members by rank
   */
  static async getCrewByRank(rank: string): Promise<CrewMaster[]> {
    const response = await apiCall<{ crew: CrewMaster[] }>(
      `${API_BASE_URL}/crew/rank/${encodeURIComponent(rank)}`,
      {
        method: 'GET',
      }
    );
    return response.crew || [];
  }

  /**
   * Get KPI definitions
   */
  static async getKPIDefinitions(): Promise<any[]> {
    return apiCall<any[]>(`${API_BASE_URL}/kpis/definitions`, {
      method: 'GET',
    });
  }

  /**
   * Get KPI by code
   */
  static async getKPIByCode(kpiCode: string): Promise<any> {
    return apiCall<any>(`${API_BASE_URL}/kpis/${kpiCode}`, {
      method: 'GET',
    });
  }

  /**
   * Get crew KPI snapshot
   */
  static async getCrewKPISnapshot(seafarerId: number): Promise<Record<string, any>> {
    return apiCall<Record<string, any>>(
      `${API_BASE_URL}/crew/${seafarerId}/kpis`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Get KPI history
   */
  static async getKPIHistory(
    seafarerId: number,
    kpiCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    return apiCall<any[]>(
      `${API_BASE_URL}/crew/${seafarerId}/kpis/${kpiCode}/history`,
      {
        method: 'GET',
        headers: {
          'X-Start-Date': startDate.toISOString(),
          'X-End-Date': endDate.toISOString(),
        },
      }
    );
  }

  /**
   * Get KPI benchmark
   */
  static async getKPIBenchmark(
    kpiCode: string,
    rank?: string
  ): Promise<{
    average: number;
    median: number;
    p75: number;
    p90: number;
  }> {
    const url = rank
      ? `${API_BASE_URL}/kpis/${kpiCode}/benchmark?rank=${encodeURIComponent(rank)}`
      : `${API_BASE_URL}/kpis/${kpiCode}/benchmark`;
    return apiCall<{
      average: number;
      median: number;
      p75: number;
      p90: number;
    }>(url, {
      method: 'GET',
    });
  }

  /**
   * Get latest AI summary for crew member
   */
  static async getLatestSummary(
    seafarerId: number,
    summaryType?: 'performance' | 'risk' | 'promotion_readiness'
  ): Promise<any> {
    const url = summaryType
      ? `${API_BASE_URL}/crew/${seafarerId}/summary?type=${summaryType}`
      : `${API_BASE_URL}/crew/${seafarerId}/summary`;
    return apiCall<any>(url, {
      method: 'GET',
    });
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return apiCall<{ status: string; timestamp: string }>(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
      }
    );
  }
}

/**
 * Helper function to check if API is available
 */
export async function checkAPIHealth(): Promise<boolean> {
  try {
    await API.healthCheck();
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to get API base URL
 */
export function getAPIBaseURL(): string {
  return API_BASE_URL;
}
