/**
 * Structured Chat Response Types
 * Defines interfaces for structured, traceable chatbot responses
 * @module types/chatResponse
 */

/**
 * Key finding from the analysis
 * Represents a single insight with supporting KPI evidence
 */
export interface KeyFinding {
  /** Human-readable finding description (no KPI codes) */
  finding: string;
  /** Array of KPI codes that support this finding (e.g., ['CO0001', 'CP0003']) */
  supportingKPIs: string[];
  /** Severity level of the finding */
  severity: 'positive' | 'neutral' | 'concern' | 'critical';
}

/**
 * KPI reference with human-readable context
 * Links KPI codes to their meaning and interpretation
 */
export interface KPIReference {
  /** KPI code (e.g., 'CO0001', 'CP0003') */
  kpiCode: string;
  /** Human-readable name from kpiColumnMapping.ts */
  humanReadableName: string;
  /** KPI category (e.g., 'Experience', 'Performance', 'Behavioral') */
  category: string;
  /** KPI score value */
  score: number | null;
  /** Interpretation of what this score means in context */
  interpretation: string;
}

/**
 * Risk indicator summary
 * Represents a risk identified from the analysis
 */
export interface RiskIndicatorSummary {
  /** Type of risk (e.g., 'Performance Decline', 'Competency Gap', 'Compliance Risk') */
  riskType: string;
  /** Severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Human-readable description (no technical codes) */
  description: string;
  /** Array of KPI codes affected by this risk */
  affectedKPIs: string[];
}

/**
 * Structured chat response
 * Comprehensive, traceable response format for chatbot interactions
 */
export interface StructuredChatResponse {
  /** Executive summary (2-3 sentences, max 150 characters) */
  summary: string;
  /** Array of 3-5 key findings from the analysis */
  keyFindings: KeyFinding[];
  /** Array of risk indicators (if any risks identified) */
  riskIndicators: RiskIndicatorSummary[];
  /** Recommended actions (max 3 actions) */
  recommendedActions: string[];
  /** KPI traceability - which KPIs support the findings */
  kpiTraceability: KPIReference[];
  /** Optional detailed analysis (longer explanation) */
  detailedAnalysis?: string;
}
