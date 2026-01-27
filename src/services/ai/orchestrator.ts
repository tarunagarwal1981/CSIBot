/**
 * AI Orchestrator
 * Coordinates AI operations, data fetching, and response processing
 * @module services/ai/orchestrator
 */

import { ClaudeClient } from './claudeClient';
import { PromptTemplates } from './prompts';
import ResponseFormatter from './responseFormatter';
import { validateStructuredResponse } from '../../utils/responseValidation';
import { CrewRepository } from '../database/repositories/crewRepository';
import { KPIRepository } from '../database/repositories/kpiRepository';
import { ExperienceRepository } from '../database/repositories/experienceRepository';
import { TrainingRepository } from '../database/repositories/trainingRepository';
import { PerformanceRepository } from '../database/repositories/performanceRepository';
import { SummaryRepository } from '../database/repositories/summaryRepository';
import { ChatRepository } from '../database/repositories/chatRepository';
import { ALL_KPI_COLUMNS } from '../../config/kpiColumnMapping';
import type {
  AISummary,
  CrewMaster,
  KPISnapshot,
  KPIDataWithDetails,
  ExperienceHistory,
  TrainingCertification,
  PerformanceEvent,
  DataSource,
} from '../../types/database';
import type { StructuredChatResponse } from '../../types/chatResponse';

/**
 * AI Orchestrator
 * Coordinates AI operations with data repositories
 */
export class AIOrchestrator {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new AI Orchestrator
   * @param claudeClient Claude client instance
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Generate performance summary for a crew member
   * Fetches all relevant data and generates comprehensive performance summary
   * @param seafarerId Seafarer ID
   * @returns Generated summary and token usage
   */
  async generatePerformanceSummary(
    seafarerId: number
  ): Promise<{
    summary: AISummary;
    tokensUsed: number;
  }> {
    try {
      // Gather all crew data
      const crewData = await this.gatherCrewData(seafarerId, true);

      // Get benchmarks for comparison
      const benchmarks: Record<string, any> = {};
      const kpiCodes = Object.keys(crewData.kpiSnapshot);
      for (const kpiCode of kpiCodes.slice(0, 10)) {
        // Get benchmarks for top 10 KPIs
        try {
          benchmarks[kpiCode] = await KPIRepository.getKPIBenchmark(kpiCode);
        } catch (error) {
          console.warn(`Failed to get benchmark for ${kpiCode}:`, error);
        }
      }

      // Build prompt
      const prompt = PromptTemplates.getPerformanceSummaryPrompt({
        crewInfo: crewData.crew,
        kpiSnapshot: crewData.kpiSnapshot,
        experience: crewData.experience,
        certifications: crewData.certifications,
        recentEvents: crewData.recentEvents,
        benchmarks,
      });

      // Call Claude API
      const systemPrompt = PromptTemplates.getSystemPrompt();
      const response = await this.claudeClient.completeJSON<{
        overall_rating: string;
        summary_text: string;
        strengths: Array<{
          area: string;
          evidence: string;
          kpi_codes: string[];
        }>;
        development_areas: Array<{
          area: string;
          evidence: string;
          recommendation: string;
          kpi_codes: string[];
        }>;
        risk_indicators: Array<{
          severity: string;
          category: string;
          description: string;
          action: string;
        }>;
        recommendations: Array<{
          priority: string;
          action: string;
          owner: string;
          timeline: string;
        }>;
      }>({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Get token usage from a separate call (since completeJSON doesn't return usage)
      const usageResponse = await this.claudeClient.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        maxTokens: 100, // Small call just to get usage
      });

      // Determine risk level from indicators
      const riskLevels = response.risk_indicators.map((r) => r.severity);
      const riskLevel = this.determineRiskLevel(riskLevels);

      // Create summary object
      const summary: Omit<AISummary, 'id' | 'generated_at'> = {
        seafarer_id: seafarerId,
        summary_type: 'performance',
        summary_text: response.summary_text,
        overall_rating: response.overall_rating,
        risk_level: riskLevel,
        strengths: response.strengths,
        development_areas: response.development_areas,
        risk_indicators: response.risk_indicators,
        recommendations: response.recommendations,
        kpi_snapshot: crewData.kpiSnapshot,
        valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        model_version: this.claudeClient.getModel(),
        tokens_used: usageResponse.usage.inputTokens + usageResponse.usage.outputTokens,
      };

      // Save summary to database
      const summaryId = await SummaryRepository.saveSummary(summary);

      // Fetch the saved summary to return
      const savedSummary = await SummaryRepository.getSummaryById(summaryId);
      if (!savedSummary) {
        throw new Error('Failed to retrieve saved summary');
      }

      return {
        summary: savedSummary,
        tokensUsed: savedSummary.tokens_used,
      };
    } catch (error: any) {
      console.error('Error generating performance summary:', error);
      throw new Error(`Failed to generate performance summary: ${error.message}`);
    }
  }

  /**
   * Analyze risks for a crew member
   * @param seafarerId Seafarer ID
   * @returns Risk analysis and token usage
   */
  async analyzeRisks(
    seafarerId: number
  ): Promise<{
    risks: Array<{
      severity: string;
      category: string;
      description: string;
      action: string;
      kpiEvidence: string[];
    }>;
    tokensUsed: number;
  }> {
    try {
      const crewData = await this.gatherCrewData(seafarerId, true);

      // Get KPI trends
      const kpiTrends: Record<string, any> = {};
      const kpiCodes = Object.keys(crewData.kpiSnapshot);
      for (const kpiCode of kpiCodes.slice(0, 10)) {
        try {
          kpiTrends[kpiCode] = await KPIRepository.getKPITrend(seafarerId, kpiCode);
        } catch (error) {
          console.warn(`Failed to get trend for ${kpiCode}:`, error);
        }
      }

      // Get failure history
      const failureHistory = await PerformanceRepository.getPerformanceEvents(
        seafarerId,
        'failure'
      );

      // Build prompt
      const prompt = PromptTemplates.getRiskAnalysisPrompt({
        crewInfo: crewData.crew,
        kpiSnapshot: crewData.kpiSnapshot,
        kpiTrends,
        recentEvents: crewData.recentEvents,
        failureHistory,
      });

      // Call Claude API
      const systemPrompt = PromptTemplates.getSystemPrompt();
      const response = await this.claudeClient.completeJSON<{
        risk_level: string;
        risk_score: number;
        indicators: Array<{
          severity: string;
          category: string;
          description: string;
          action: string;
          evidence: string[];
        }>;
        summary: string;
        recommended_actions: string[];
      }>({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Get token usage
      const usageResponse = await this.claudeClient.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        maxTokens: 100,
      });

      // Map evidence to KPI codes
      const risks = response.indicators.map((indicator) => ({
        severity: indicator.severity,
        category: indicator.category,
        description: indicator.description,
        action: indicator.action,
        kpiEvidence: indicator.evidence.filter((e) =>
          /[A-Z]{2}\d{4}/.test(e)
        ), // Extract KPI codes from evidence
      }));

      return {
        risks,
        tokensUsed:
          usageResponse.usage.inputTokens + usageResponse.usage.outputTokens,
      };
    } catch (error: any) {
      console.error('Error analyzing risks:', error);
      throw new Error(`Failed to analyze risks: ${error.message}`);
    }
  }

  /**
   * Handle chat query (main chatbot function)
   * Processes natural language queries and generates responses
   * 
   * Data Flow:
   * 1. Extract seafarer name from user query (if present)
   * 2. Look up crew_master by seafarer_name → get crew_code, current_rank_name, etc.
   * 3. Use crew_code to fetch data from vessel_master and other tables
   * 4. For general queries (no seafarer name), relevantCrewData is null and AI handles it
   * 
   * @param query User query
   * @param sessionId Chat session ID
   * @returns Chat response with data sources and reasoning
   */
  async handleChatQuery(
    query: string,
    sessionId: string
  ): Promise<{
    response: string;
    structuredResponse: StructuredChatResponse;
    dataSources?: DataSource[];
    reasoningSteps?: string[];
    tokensUsed: number;
    validationErrors?: string[];
  }> {
    try {
      // First, understand the query
      const understandingPrompt = PromptTemplates.getQueryUnderstandingPrompt(query);
      const systemPrompt = PromptTemplates.getSystemPrompt();

      const queryUnderstanding = await this.claudeClient.completeJSON<{
        intent: string;
        entities: {
          crew_members: string[];
          kpi_codes: string[];
          time_range?: { start?: string; end?: string };
        };
        required_data_sources: string[];
      }>({
        messages: [{ role: 'user', content: understandingPrompt }],
        systemPrompt,
        temperature: 0.3,
      });

      console.log('📋 Query understanding result:', JSON.stringify(queryUnderstanding, null, 2));
      console.log(`👥 Extracted crew members: ${queryUnderstanding.entities.crew_members.length} - ${JSON.stringify(queryUnderstanding.entities.crew_members)}`);

      // Get conversation history
      const conversationHistory = await ChatRepository.getConversationHistory(sessionId, 10);

      // Gather relevant crew data if crew member is mentioned OR if query needs multiple crew
      let relevantCrewData: any = null;
      let kpiContext: any = null;
      let multipleCrewData: any[] = [];

      // Check if query needs multiple crew (e.g., "high-risk", "all crew", "list crew")
      const needsMultipleCrew = 
        query.toLowerCase().includes('high-risk') ||
        query.toLowerCase().includes('high risk') ||
        query.toLowerCase().includes('risk crew') ||
        query.toLowerCase().includes('show me') ||
        query.toLowerCase().includes('list') ||
        query.toLowerCase().includes('all crew') ||
        query.toLowerCase().includes('find crew') ||
        queryUnderstanding.intent === 'risk_analysis' && queryUnderstanding.entities.crew_members.length === 0;

      if (needsMultipleCrew) {
        // Try to query high-risk crew members from AI summaries first
        try {
          const { SummaryRepository } = await import('../database/repositories/summaryRepository');
          const highRiskSummaries = await SummaryRepository.getSummariesByRiskLevel('HIGH', 20);
          const criticalRiskSummaries = await SummaryRepository.getSummariesByRiskLevel('CRITICAL', 20);
          
          // Combine and get unique seafarer IDs
          const allRiskSummaries = [...highRiskSummaries, ...criticalRiskSummaries];
          const uniqueSeafarerIds = [...new Set(allRiskSummaries.map(s => s.seafarer_id))];
          
          if (uniqueSeafarerIds.length > 0) {
            // Get crew info for each
            const crewList = await Promise.all(
              uniqueSeafarerIds.slice(0, 20).map(async (seafarerId) => {
                const crew = await CrewRepository.getCrewById(seafarerId);
                if (crew) {
                  const summary = allRiskSummaries.find(s => s.seafarer_id === seafarerId);
                  const kpiSnapshot = await KPIRepository.getCrewKPISnapshot(seafarerId);
                  return {
                    crew,
                    summary,
                    kpiSnapshot,
                  };
                }
                return null;
              })
            );
            
            multipleCrewData = crewList.filter(c => c !== null);
          }
        } catch (error) {
          console.warn('Could not query AI summaries, falling back to direct crew analysis:', error);
        }
        
        // Fallback: If no summaries found, query crew directly and analyze KPIs
        if (multipleCrewData.length === 0) {
          console.log('No AI summaries found, querying crew directly...');
          // Get a sample of crew members
          const crewList = await CrewRepository.getCrewList(1, 50);
          
          // Analyze each crew member's KPIs to identify high-risk
          const analyzedCrew = await Promise.all(
            crewList.crew.slice(0, 30).map(async (crew) => {
              try {
                const kpiSnapshot = await KPIRepository.getCrewKPISnapshot(crew.seafarer_id);
                
                // Simple risk scoring: count KPIs below threshold (assuming lower is worse for most)
                // This is a simplified approach - in production, use proper risk analysis
                const riskFactors: string[] = [];
                let riskScore = 0;
                
                for (const [kpiCode, value] of Object.entries(kpiSnapshot)) {
                  if (typeof value === 'number') {
                    // Simple heuristic: values below 50 might indicate issues
                    // In production, use proper benchmarks per KPI
                    if (value < 50) {
                      riskScore++;
                      riskFactors.push(`${kpiCode}: ${value}`);
                    }
                  }
                }
                
                // Consider high-risk if risk score > 5 or has multiple low KPIs
                if (riskScore >= 5) {
                  return {
                    crew,
                    kpiSnapshot,
                    riskScore,
                    riskFactors: riskFactors.slice(0, 5), // Top 5 risk factors
                    estimatedRiskLevel: riskScore >= 10 ? 'HIGH' : riskScore >= 7 ? 'MEDIUM' : 'LOW',
                  };
                }
                return null;
              } catch (error) {
                console.warn(`Failed to analyze crew ${crew.seafarer_id}:`, error);
                return null;
              }
            })
          );
          
          // Sort by risk score and take top 20
          multipleCrewData = analyzedCrew
            .filter(c => c !== null)
            .sort((a, b) => (b?.riskScore || 0) - (a?.riskScore || 0))
            .slice(0, 20);
        }
      } else if (queryUnderstanding.entities.crew_members.length > 0) {
        // Try to find crew member by code first, then by name
        const crewIdentifier = queryUnderstanding.entities.crew_members[0];
        console.log(`🔍 Searching for crew member: "${crewIdentifier}"`);
        
        let crew = await CrewRepository.getCrewByCode(crewIdentifier);
        console.log(`📋 Search by code result:`, crew ? `Found: ${crew.seafarer_name}` : 'Not found');
        
        // If not found by code, try searching by name
        if (!crew) {
          console.log(`🔍 Trying name search for: "${crewIdentifier}"`);
          const crewList = await CrewRepository.searchCrew(crewIdentifier, 5);
          console.log(`📋 Name search found ${crewList.length} results`);
          if (crewList.length > 0) {
            crew = crewList[0]; // Use first match
            console.log(`✅ Using first match: ${crew.seafarer_name} (ID: ${crew.seafarer_id})`);
          }
        }
        
        if (crew) {
          console.log(`📊 Gathering crew data for: ${crew.seafarer_name} (Code: ${crew.crew_code}, Rank: ${crew.current_rank_name})`);
          try {
            // Pass the crew object so we can use crew_code for all queries
            relevantCrewData = await this.gatherCrewData(crew, false);
            // Use comprehensive KPI data with details, fallback to snapshot for backward compatibility
            kpiContext = relevantCrewData.kpiData || relevantCrewData.kpiSnapshot;
            console.log(`✅ Crew data gathered successfully. KPIs: ${relevantCrewData.kpiData?.length || Object.keys(relevantCrewData.kpiSnapshot || {}).length} found`);
          } catch (error: any) {
            console.error(`❌ Failed to gather crew data:`, error.message);
          }
        } else {
          console.log(`⚠️ Crew member not found: "${crewIdentifier}"`);
        }
      }

      // Build chat response prompt
      // Note: For general queries (no seafarer name), relevantCrewData will be null
      // The AI will handle these queries using its knowledge or ask for clarification
      console.log(`📝 Building prompt. Has relevantCrewData: ${!!relevantCrewData}, Has kpiContext: ${!!kpiContext}`);
      const chatPrompt = PromptTemplates.getChatResponsePrompt({
        query,
        conversationHistory,
        relevantCrewData,
        kpiContext,
        multipleCrewData: multipleCrewData.length > 0 ? multipleCrewData : undefined,
      });

      // Call Claude API
      const response = await this.claudeClient.complete({
        messages: [{ role: 'user', content: chatPrompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Get KPI data for formatting (use comprehensive data if available)
      let kpiDataForFormatting: KPIDataWithDetails[] = [];
      if (relevantCrewData && relevantCrewData.kpiData && Array.isArray(relevantCrewData.kpiData)) {
        kpiDataForFormatting = relevantCrewData.kpiData;
      } else if (kpiContext && Array.isArray(kpiContext)) {
        kpiDataForFormatting = kpiContext;
      }

      // Format the response using ResponseFormatter
      let structuredResponse: StructuredChatResponse;
      try {
        // Try to parse as JSON first (since we're asking for JSON format)
        let rawResponseText = response.content.trim();
        
        // Remove markdown code blocks if present
        if (rawResponseText.startsWith('```json')) {
          rawResponseText = rawResponseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawResponseText.startsWith('```')) {
          rawResponseText = rawResponseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to parse JSON
        try {
          const parsedJson = JSON.parse(rawResponseText);
          // If it's already structured, use it
          structuredResponse = ResponseFormatter.formatStructuredResponse(
            JSON.stringify(parsedJson),
            kpiDataForFormatting
          );
        } catch {
          // If not JSON, format the text response
          structuredResponse = ResponseFormatter.formatStructuredResponse(
            rawResponseText,
            kpiDataForFormatting
          );
        }
      } catch (error) {
        console.warn('Error formatting structured response, using fallback:', error);
        // Fallback: create minimal structured response
        structuredResponse = {
          summary: ResponseFormatter.stripTechnicalCodes(response.content.substring(0, 150)),
          keyFindings: [],
          riskIndicators: [],
          recommendedActions: [],
          kpiTraceability: ResponseFormatter.extractKPIReferences(response.content, kpiDataForFormatting),
        };
      }

      // Validate structured response
      const validation = validateStructuredResponse(structuredResponse);
      let validationErrors: string[] | undefined;
      
      if (!validation.valid) {
        console.warn('⚠️ Structured response validation failed:', validation.errors);
        validationErrors = validation.errors;
        
        // Optionally retry with stricter prompt if critical errors
        const hasCriticalErrors = validation.errors.some(
          error => error.includes('KPI codes') || error.includes('exceeds')
        );
        
        if (hasCriticalErrors) {
          console.log('🔄 Critical validation errors detected, but continuing with current response');
          // Could implement retry logic here if needed
          // For now, we'll log and continue with the response
        }
      } else {
        console.log('✅ Structured response validation passed');
      }

      // Clean the response text (remove technical codes)
      const cleanedResponse = ResponseFormatter.stripTechnicalCodes(response.content);

      // Extract data sources from query understanding
      const dataSources: DataSource[] = [];
      if (kpiContext && queryUnderstanding.entities.kpi_codes.length > 0) {
        // Handle both array format (KPIDataWithDetails[]) and object format (KPISnapshot)
        if (Array.isArray(kpiContext)) {
          // Comprehensive KPI data format
          for (const kpiCode of queryUnderstanding.entities.kpi_codes) {
            const kpiData = kpiContext.find((k: KPIDataWithDetails) => k.kpiCode === kpiCode);
            if (kpiData) {
              dataSources.push({
                kpi: kpiCode,
                value: kpiData.score,
                table: kpiData.view,
              });
            }
          }
        } else {
          // Legacy snapshot format
          for (const kpiCode of queryUnderstanding.entities.kpi_codes) {
            if (kpiContext[kpiCode] !== undefined) {
              dataSources.push({
                kpi: kpiCode,
                value: kpiContext[kpiCode],
                table: 'kpi_value',
              });
            }
          }
        }
      }

      // Generate reasoning steps (simplified - could be enhanced)
      const reasoningSteps = [
        `Identified intent: ${queryUnderstanding.intent}`,
        `Extracted entities: ${JSON.stringify(queryUnderstanding.entities)}`,
        `Retrieved relevant data sources: ${queryUnderstanding.required_data_sources.join(', ')}`,
        `Generated response based on context and data`,
      ];

      return {
        response: cleanedResponse,
        structuredResponse,
        dataSources: dataSources.length > 0 ? dataSources : undefined,
        reasoningSteps,
        tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
        validationErrors: validationErrors,
      };
    } catch (error: any) {
      console.error('Error handling chat query:', error);
      throw new Error(`Failed to handle chat query: ${error.message}`);
    }
  }

  /**
   * Explain a specific KPI
   * @param seafarerId Seafarer ID
   * @param kpiCode KPI code
   * @returns KPI explanation with context
   */
  async explainKPI(
    seafarerId: number,
    kpiCode: string
  ): Promise<{
    explanation: string;
    currentValue: number;
    benchmark: any;
    trend: any;
    tokensUsed: number;
  }> {
    try {
      // Get KPI definition
      const kpiDefinition = await KPIRepository.getKPIByCode(kpiCode);
      if (!kpiDefinition) {
        throw new Error(`KPI definition not found: ${kpiCode}`);
      }

      // Get current value
      const kpiSnapshot = await KPIRepository.getCrewKPISnapshot(seafarerId);
      const currentValue = kpiSnapshot[kpiCode] ?? null;

      // Get benchmark
      const crew = await CrewRepository.getCrewById(seafarerId);
      const benchmark = await KPIRepository.getKPIBenchmark(
        kpiCode,
        crew?.current_rank_name
      );

      // Get trend
      const trend = await KPIRepository.getKPITrend(seafarerId, kpiCode);

      // Get source data (simplified)
      const sourceData = {
        kpiDefinition,
        currentValue,
        benchmark,
        trend,
      };

      // Build prompt
      const prompt = PromptTemplates.getKPIExplanationPrompt({
        kpiCode,
        kpiDefinition,
        value: currentValue,
        benchmark,
        trend,
        sourceData,
      });

      // Call Claude API
      const systemPrompt = PromptTemplates.getSystemPrompt();
      const response = await this.claudeClient.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      return {
        explanation: response.content,
        currentValue: currentValue ?? 0,
        benchmark,
        trend,
        tokensUsed: response.usage.inputTokens + response.usage.outputTokens,
      };
    } catch (error: any) {
      console.error('Error explaining KPI:', error);
      throw new Error(`Failed to explain KPI: ${error.message}`);
    }
  }

  /**
   * Compare two crew members
   * @param seafarerId1 First seafarer ID
   * @param seafarerId2 Second seafarer ID
   * @param aspects Aspects to compare
   * @returns Comparison analysis
   */
  async compareCrewMembers(
    seafarerId1: number,
    seafarerId2: number,
    aspects: string[]
  ): Promise<{
    comparison: string;
    structuredComparison: any;
    tokensUsed: number;
  }> {
    try {
      // Gather data for both crew members
      const crewData1 = await this.gatherCrewData(seafarerId1, false);
      const crewData2 = await this.gatherCrewData(seafarerId2, false);

      // Build comparison data
      const comparisonData = {
        crew1: {
          info: crewData1.crew,
          kpis: crewData1.kpiSnapshot,
          experience: crewData1.experience.length,
          certifications: crewData1.certifications.length,
        },
        crew2: {
          info: crewData2.crew,
          kpis: crewData2.kpiSnapshot,
          experience: crewData2.experience.length,
          certifications: crewData2.certifications.length,
        },
        comparisonAspects: aspects.length > 0 ? aspects : ['Performance', 'Experience', 'Qualifications'],
      };

      // Build prompt
      const prompt = PromptTemplates.getComparisonPrompt(comparisonData);

      // Call Claude API
      const systemPrompt = PromptTemplates.getSystemPrompt();
      const structuredResponse = await this.claudeClient.completeJSON<{
        summary: string;
        aspects: Array<{
          aspect: string;
          crew1_assessment: string;
          crew2_assessment: string;
          comparison: string;
          winner: string;
        }>;
        key_differences: string[];
        recommendations: Array<{
          for_crew1: string;
          for_crew2: string;
        }>;
      }>({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Get natural language response
      const naturalResponse = await this.claudeClient.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      return {
        comparison: naturalResponse.content,
        structuredComparison: structuredResponse,
        tokensUsed:
          naturalResponse.usage.inputTokens + naturalResponse.usage.outputTokens,
      };
    } catch (error: any) {
      console.error('Error comparing crew members:', error);
      throw new Error(`Failed to compare crew members: ${error.message}`);
    }
  }

  /**
   * Assess promotion readiness
   * @param seafarerId Seafarer ID
   * @param targetRank Target rank for promotion
   * @returns Promotion readiness assessment
   */
  async assessPromotionReadiness(
    seafarerId: number,
    targetRank: string
  ): Promise<{
    assessment: string;
    readiness: 'ready' | 'nearly_ready' | 'not_ready';
    gaps: string[];
    timeline: string;
    tokensUsed: number;
  }> {
    try {
      const crewData = await this.gatherCrewData(seafarerId, true);
      const crew = crewData.crew;

      // Get promotion requirements (simplified - would come from a requirements repository)
      const requirements = {
        minSeaTime: 24, // months
        requiredCertifications: ['STCW Basic Safety', 'STCW Advanced Fire Fighting'],
        minKPIScore: 70,
      };

      // Build prompt
      const prompt = PromptTemplates.getPromotionReadinessPrompt({
        crewInfo: crew,
        currentRank: crew.current_rank_name,
        targetRank,
        kpiSnapshot: crewData.kpiSnapshot,
        certifications: crewData.certifications,
        experience: crewData.experience,
        requirements,
      });

      // Call Claude API
      const systemPrompt = PromptTemplates.getSystemPrompt();
      const response = await this.claudeClient.completeJSON<{
        readiness_level: string;
        readiness_score: number;
        summary: string;
        requirements_met: {
          performance: boolean;
          qualifications: boolean;
          experience: boolean;
          competency: boolean;
        };
        gaps: Array<{
          category: string;
          description: string;
          severity: string;
          action_required: string;
        }>;
        strengths: string[];
        recommendations: Array<{
          priority: string;
          action: string;
          timeline: string;
        }>;
        estimated_readiness_date: string | null;
      }>({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Get natural language response
      const naturalResponse = await this.claudeClient.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature: 0.7,
      });

      // Map readiness level
      const readinessMap: Record<string, 'ready' | 'nearly_ready' | 'not_ready'> = {
        READY: 'ready',
        NOT_READY: 'not_ready',
        CONDITIONAL: 'nearly_ready',
      };

      return {
        assessment: naturalResponse.content,
        readiness: readinessMap[response.readiness_level] || 'not_ready',
        gaps: response.gaps.map((g) => `${g.category}: ${g.description}`),
        timeline: response.estimated_readiness_date || 'TBD',
        tokensUsed:
          naturalResponse.usage.inputTokens + naturalResponse.usage.outputTokens,
      };
    } catch (error: any) {
      console.error('Error assessing promotion readiness:', error);
      throw new Error(`Failed to assess promotion readiness: ${error.message}`);
    }
  }

  /**
   * Gather all relevant data for a seafarer
   * Uses crew_code from the crew object to fetch data from other tables
   * Focuses on comprehensive KPI data with scores and JSON details from all 4 views
   * @param crewOrId Crew master object (with crew_code) OR seafarer ID
   * @param includeHistory Whether to include historical data (minimized - focus on KPI data)
   * @returns Aggregated crew data with comprehensive KPI information
   */
  private async gatherCrewData(
    crewOrId: CrewMaster | number,
    includeHistory: boolean = false
  ): Promise<{
    crew: CrewMaster;
    kpiData: KPIDataWithDetails[];
    kpiSnapshot: KPISnapshot; // Kept for backward compatibility
    experience: ExperienceHistory[];
    certifications: TrainingCertification[];
    recentEvents: PerformanceEvent[];
  }> {
    // Get crew master info if we received an ID
    let crew: CrewMaster;
    if (typeof crewOrId === 'number') {
      const crewResult = await CrewRepository.getCrewById(crewOrId);
      if (!crewResult) {
        throw new Error(`Crew member not found: ${crewOrId}`);
      }
      crew = crewResult;
    } else {
      crew = crewOrId;
    }
    
    // Now we have crew object with crew_code, current_rank_name, etc.
    // Use crew_code for vessel_master queries and seafarer_id for other tables

    // Get comprehensive KPI data with scores and JSON details from all 4 views
    const kpiData = await KPIRepository.getCrewKPIWithDetails(crew.seafarer_id);

    // Also get KPI snapshot for backward compatibility (used by other methods)
    const kpiSnapshot = await KPIRepository.getCrewKPISnapshot(crew.seafarer_id);

    // Minimize other data sources - focus on KPI data from the 4 views
    // These are already returning empty arrays from repositories, but kept for structure
    const experience: ExperienceHistory[] = []; // Minimized - KPI data is primary source
    const certifications: TrainingCertification[] = []; // Minimized - training data in KPI CO0010, CO0011
    const recentEvents: PerformanceEvent[] = []; // Minimized - performance data in KPI views

    return {
      crew,
      kpiData, // Comprehensive KPI data with scores and details
      kpiSnapshot, // Kept for backward compatibility
      experience,
      certifications,
      recentEvents,
    };
  }

  /**
   * Determine overall risk level from risk indicators
   * @param riskLevels Array of risk severity levels
   * @returns Overall risk level
   */
  private determineRiskLevel(
    riskLevels: string[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (riskLevels.includes('CRITICAL')) return 'CRITICAL';
    if (riskLevels.includes('HIGH')) return 'HIGH';
    if (riskLevels.includes('MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }
}
