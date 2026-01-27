/**
 * TypeScript types for the Crew Performance System database schema
 * @module types/database
 */

/**
 * Crew master record containing seafarer information
 */
export interface CrewMaster {
  /** Primary key - unique seafarer identifier */
  seafarer_id: number;
  /** Unique crew code identifier */
  crew_code: string;
  /** Full name of the seafarer */
  seafarer_name: string;
  /** Email address */
  email_id: string;
  /** Current rank/title */
  current_rank_name: string;
  /** Contact phone number */
  contact_number: string;
  /** Current sailing status */
  sailing_status: 'atsea' | 'onleave';
  /** Department name */
  department_name: string;
  /** POD (Personnel on Duty) name */
  pod_name: string;
  /** Record creation timestamp */
  created_at: Date;
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * KPI definition master data
 */
export interface KPIDefinition {
  /** Primary key - unique KPI code (e.g., "CO0004", "CP0005") */
  kpi_code: string;
  /** KPI title/name */
  title: string;
  /** Detailed description of the KPI */
  description: string;
  /** Units of measurement */
  units: string;
  /** Parent KPI code for hierarchical KPIs, null if root */
  parent_code: string | null;
  /** KPI orientation - positive (higher is better) or negative (lower is better) */
  kpi_orientation: 'p' | 'n';
  /** Current status of the KPI */
  status: 'Active' | 'Inactive';
  /** Record creation timestamp */
  created_at: Date;
  /** Record last update timestamp */
  updated_at: Date;
}

/**
 * KPI value record for a specific seafarer
 */
export interface KPIValue {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Foreign key to KPIDefinition */
  kpi_code: string;
  /** Numeric KPI value */
  value: number;
  /** JSONB field for complex structured data */
  value_json: any;
  /** Timestamp when KPI was calculated */
  calculated_at: Date;
  /** Start date of validity period */
  valid_from: Date;
  /** End date of validity period, null if currently valid */
  valid_to: Date | null;
}

/**
 * Experience history record for seafarer voyages
 */
export interface ExperienceHistory {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Name of the vessel */
  vessel_name: string;
  /** IMO number of the vessel */
  vessel_imo: string;
  /** Type of vessel */
  vessel_type: string;
  /** Rank held during this experience */
  rank: string;
  /** Sign-on date */
  sign_on_date: Date;
  /** Sign-off date, null if currently on board */
  sign_off_date: Date | null;
  /** Tenure duration in months */
  tenure_months: number;
  /** Type of experience */
  experience_type: string;
  /** JSONB field for additional details */
  details: any;
}

/**
 * Training and certification record
 */
export interface TrainingCertification {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Name of the course/training */
  course_name: string;
  /** Type of certification */
  certification_type: string;
  /** Issue date of the certification */
  issue_date: Date;
  /** Expiry date, null if no expiry */
  expiry_date: Date | null;
  /** Issuing authority */
  issuing_authority: string;
  /** Current status of the certification */
  status: 'valid' | 'expiring_soon' | 'expired';
  /** JSONB field for additional details */
  details: any;
}

/**
 * Performance event record (failures, incidents, inspections, appraisals)
 */
export interface PerformanceEvent {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Type of performance event */
  event_type: 'failure' | 'inspection' | 'incident' | 'appraisal';
  /** Date when the event occurred */
  event_date: Date;
  /** Event category */
  category: string;
  /** Detailed description */
  description: string;
  /** Severity level, null if not applicable */
  severity: 'critical' | 'high' | 'medium' | 'low' | null;
  /** Voyage number, null if not applicable */
  voyage_number: string | null;
  /** Vessel name where event occurred */
  vessel_name: string;
  /** Port location, null if not applicable */
  port: string | null;
  /** Authority involved, null if not applicable */
  authority: string | null;
  /** Outcome/resolution status, null if pending */
  outcome: 'resolved' | 'pending' | 'recurrent' | null;
  /** JSONB field for additional details */
  details: any;
}

/**
 * Performance appraisal record
 */
export interface Appraisal {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Vessel name for the appraisal period */
  vessel_name: string;
  /** Start date of appraisal period */
  from_date: Date;
  /** End date of appraisal period */
  to_date: Date;
  /** Date when appraisal was conducted */
  appraisal_date: Date;
  /** Current status of the appraisal */
  status: 'Initiated' | 'Completed' | 'Pending';
  /** Name of the appraiser, null if not assigned */
  appraiser_name: string | null;
  /** Overall rating score, null if not yet rated */
  rating: number | null;
  /** Leadership score, null if not rated */
  leadership_score: number | null;
  /** Management score, null if not rated */
  management_score: number | null;
  /** Teamwork score, null if not rated */
  teamwork_score: number | null;
  /** Knowledge score, null if not rated */
  knowledge_score: number | null;
  /** Feedback status, null if not provided */
  feedback_status: string | null;
  /** Remarks/comments, null if not provided */
  remarks: string | null;
  /** JSONB field for additional details */
  details: any;
}

/**
 * Strength area with evidence and related KPIs
 */
export interface Strength {
  /** Area of strength */
  area: string;
  /** Evidence supporting this strength */
  evidence: string;
  /** Related KPI codes */
  kpi_codes: string[];
}

/**
 * Development area with evidence, recommendations, and related KPIs
 */
export interface DevelopmentArea {
  /** Area needing development */
  area: string;
  /** Evidence supporting this need */
  evidence: string;
  /** Recommended action */
  recommendation: string;
  /** Related KPI codes */
  kpi_codes: string[];
}

/**
 * Risk indicator with severity and action
 */
export interface RiskIndicator {
  /** Severity level */
  severity: string;
  /** Risk category */
  category: string;
  /** Description of the risk */
  description: string;
  /** Recommended action */
  action: string;
}

/**
 * Recommendation with priority and ownership
 */
export interface Recommendation {
  /** Priority level */
  priority: string;
  /** Recommended action */
  action: string;
  /** Owner responsible for action */
  owner: string;
  /** Timeline for completion */
  timeline: string;
}

/**
 * AI-generated summary for crew performance analysis
 */
export interface AISummary {
  /** Primary key */
  id: number;
  /** Foreign key to CrewMaster */
  seafarer_id: number;
  /** Type of summary generated */
  summary_type: 'performance' | 'risk' | 'promotion_readiness';
  /** Full summary text */
  summary_text: string;
  /** Overall performance rating */
  overall_rating: string;
  /** Risk level assessment */
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Array of identified strengths */
  strengths: Strength[];
  /** Array of development areas */
  development_areas: DevelopmentArea[];
  /** Array of risk indicators */
  risk_indicators: RiskIndicator[];
  /** Array of recommendations */
  recommendations: Recommendation[];
  /** Snapshot of all KPI values at generation time */
  kpi_snapshot: Record<string, any>;
  /** Timestamp when summary was generated */
  generated_at: Date;
  /** Date until which summary is considered valid */
  valid_until: Date;
  /** AI model version used */
  model_version: string;
  /** Number of tokens used in generation */
  tokens_used: number;
}

/**
 * Chat session record
 */
export interface ChatSession {
  /** Primary key - UUID */
  session_id: string;
  /** User identifier */
  user_id: string;
  /** Session start timestamp */
  started_at: Date;
  /** Session end timestamp, null if active */
  ended_at: Date | null;
  /** Total number of messages in session */
  total_messages: number;
  /** Total tokens consumed in session */
  total_tokens: number;
}

/**
 * Data source reference for chat messages
 */
export interface DataSource {
  /** KPI code referenced */
  kpi: string;
  /** Value retrieved */
  value: any;
  /** Source table name */
  table: string;
}

/**
 * Chat message record
 */
export interface ChatMessage {
  /** Primary key */
  id: number;
  /** Foreign key to ChatSession */
  session_id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Message content */
  content: string;
  /** Reasoning steps (for assistant messages), null if not applicable */
  reasoning_steps: string[] | null;
  /** Data sources referenced in the message, null if none */
  data_sources: DataSource[] | null;
  /** Structured response data (for assistant messages), null if not applicable */
  structured_response?: any | null;
  /** Tokens used for this message */
  tokens_used: number;
  /** Message creation timestamp */
  created_at: Date;
}

/**
 * KPI Snapshot - dynamic record of all KPI values
 * Keys are KPI codes (CO0001, CP0001, etc.)
 * Values are the numeric KPI values
 */
export interface KPISnapshot {
  seafarer_id: number;
  [kpiCode: string]: number | null; // Dynamic KPI values indexed by KPI code (null for missing values)
}

/**
 * Comprehensive KPI data with score and parsed JSON details
 */
export interface KPIDataWithDetails {
  /** KPI code (e.g., "CO0001", "CP0001") */
  kpiCode: string;
  /** Numeric KPI score value */
  score: number | null;
  /** Parsed JSON object from json_* column (null if no JSON column or parsing fails) */
  details: any;
  /** KPI category (e.g., "Experience", "Performance", "Behavioral") */
  category: string;
  /** Human-readable description of the KPI */
  description: string;
  /** Source view name */
  view: 'vw_csi_competency' | 'vw_csi_capability' | 'vw_csi_character' | 'vw_csi_collaboration';
  /** Whether JSON details are available */
  hasDetails: boolean;
}

/**
 * Comprehensive KPI snapshot with all details
 */
export interface ComprehensiveKPISnapshot {
  /** Seafarer ID */
  seafarer_id: number;
  /** Array of KPI data with scores and details */
  kpis: KPIDataWithDetails[];
}

/**
 * Structured risk evaluation
 */
export interface RiskAssessment {
  /** Overall risk level */
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Risk score (0-100) */
  risk_score: number;
  /** Array of identified risk indicators */
  indicators: RiskIndicator[];
  /** Summary of risk factors */
  summary: string;
  /** Recommended actions */
  recommended_actions: string[];
}

/**
 * Aggregated data for one crew member
 * Contains all relevant information for performance analysis
 */
export interface CrewPerformanceData {
  /** Crew master information */
  crew: CrewMaster;
  /** Current KPI values */
  kpi_values: KPIValue[];
  /** Experience history */
  experience_history: ExperienceHistory[];
  /** Training and certifications */
  training_certifications: TrainingCertification[];
  /** Performance events */
  performance_events: PerformanceEvent[];
  /** Appraisals */
  appraisals: Appraisal[];
  /** AI summaries */
  ai_summaries: AISummary[];
  /** Current KPI snapshot */
  kpi_snapshot: KPISnapshot;
  /** Risk assessment */
  risk_assessment: RiskAssessment | null;
}

/**
 * Chat request payload
 */
export interface ChatRequest {
  /** Session ID (UUID) */
  session_id: string;
  /** User message content */
  message: string;
  /** Optional seafarer ID to focus the conversation */
  seafarer_id?: number;
  /** Optional context to include */
  context?: {
    /** Include KPI data */
    include_kpis?: boolean;
    /** Include performance events */
    include_events?: boolean;
    /** Include appraisals */
    include_appraisals?: boolean;
    /** Include AI summaries */
    include_summaries?: boolean;
  };
}

/**
 * Chat response payload
 */
export interface ChatResponse {
  /** Response message content */
  message: string;
  /** Reasoning steps (if applicable) */
  reasoning_steps?: string[];
  /** Data sources referenced */
  data_sources?: DataSource[];
  /** Tokens used for this response */
  tokens_used: number;
  /** Session ID */
  session_id: string;
  /** Message ID */
  message_id: number;
  /** Timestamp */
  created_at: Date;
}
