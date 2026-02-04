/**
 * Prompt Templates
 * Reusable prompt templates for Claude AI interactions
 * @module services/ai/prompts
 */

import type {
  CrewMaster,
  KPISnapshot,
  KPIDataWithDetails,
  KPIDefinition,
  ExperienceHistory,
  TrainingCertification,
  PerformanceEvent,
  ChatMessage,
} from '../../types/database';

/**
 * Complete KPI code to human-readable translation reference
 * Used to ensure Claude never outputs technical codes to users
 */
export const KPI_TRANSLATION_REFERENCE = {
  // COMPETENCY (CO) - Experience & Training
  'CO0001': 'work experience with the company',
  'CO0002': 'experience in current rank',
  'CO0003': 'experience with current ship type (e.g., tankers, bulk carriers)',
  'CO0004': 'recent specialized vessel experience',
  'CO0005': 'new vessel delivery/takeover experience',
  'CO0006': 'second-hand vessel takeover experience',
  'CO0007': 'onboard training courses completed',
  'CO0008': 'dry dock project experience',
  'CO0009': 'computer-based training assessment score',
  'CO0010': 'formal training certifications',
  'CO0011': 'higher-level certificates',

  // CAPABILITY (CP) - Performance & Medical
  'CP0001': 'successful voyage performance rate',
  'CP0002': 'days since last operational failure',
  'CP0003': 'average performance appraisal score',
  'CP0004': 'psychometric assessment score',
  'CP0005': 'medical-related contract terminations',

  // CHARACTER (CH) - Reliability & Behavioral
  'CH0001': 'contract completion success rate',
  'CH0002': 'off-hire days due to crew issues',
  'CH0003': 'sign-on delays',
  'CH0004': 'leadership assessment score',
  'CH0005': 'management capability score',
  'CH0006': 'teamwork collaboration score',
  'CH0007': 'technical knowledge score',

  // COLLABORATION (CL) - Compliance & Communication
  'CL0001': 'negative inspection findings',
  'CL0002': 'vessel detentions',
  'CL0003': 'positive inspection results',
  'CL0004': 'vetting awards and recognition',
  'CL0005': 'major incidents',
  'CL0006': 'shore communication effectiveness',
  'CL0007': 'onboard communication effectiveness',
} as const;

/**
 * Helper function to translate KPI code to human description
 */
export function translateKPICode(kpiCode: string): string {
  return KPI_TRANSLATION_REFERENCE[kpiCode as keyof typeof KPI_TRANSLATION_REFERENCE] 
    || kpiCode; // Fallback to code if not found
}

/**
 * Prompt templates for various AI tasks
 */
export class PromptTemplates {
  /**
   * System prompt defining Claude's role as maritime crew performance analyst
   * @returns System prompt string
   */
  static getSystemPrompt(): string {
    return `You are an expert maritime crew performance analyst with deep expertise in:
- Seafarer performance evaluation and KPI analysis
- Maritime industry standards and regulations (STCW, IMO, etc.)
- Risk assessment and safety management
- Crew competency evaluation and career development
- Vessel operations and technical knowledge

Your role is to:
1. Provide data-driven, objective performance assessments
2. Identify strengths and development areas with evidence
3. Assess risks accurately without bias
4. Offer actionable, practical recommendations
5. Maintain professional, respectful tone in all communications
6. Explain complex maritime concepts clearly
7. Reference specific KPIs, data points, and evidence in your analysis

CRITICAL GUARDRAILS:
1. **No Technical Codes in User-Facing Text**: NEVER show KPI codes (CO0001, CP0005, etc.) in explanations, summaries, or findings. Always translate to human descriptions like "work experience with company" or "voyage success rate".

2. **Data Boundary - You Have Access To**:
   
   A. CREW MASTER DATA (vw_csi_crew_master):
      - Basic info: name, code, rank, department, contact
      - **Current status: sailing_status (atsea/onleave)**
      - **Current assignment: current_vessel_name**
      - Pod assignment
   
   B. 30 PERFORMANCE KPIs across 4 categories:
      - COMPETENCY (CO0001-CO0011): 11 KPIs on experience, training, certifications
      - CAPABILITY (CP0001-CP0005): 5 KPIs on performance, medical history
      - CHARACTER (CH0001-CH0007): 7 KPIs on contract reliability, behavioral scores
      - COLLABORATION (CL0001-CL0007): 7 KPIs on inspections, incidents, communication
   
   C. KPI DETAILS (JSON columns):
      - Each KPI has a numeric score AND detailed JSON with breakdowns
      - Example: CP0001 score + JSON with voyage count, success count, failure details
      - Example: CL0001 score + JSON with inspection dates, ports, findings

3. **What You DON'T Have Access To**:
   - Real-time vessel positions or GPS data
   - Detailed medical records (only sign-off counts)
   - Salary or compensation information
   - Personal family or emergency contact details
   - Future roster or scheduling (only current status)
   - Detailed incident investigation reports (only summary counts/scores)
   
   If asked about unavailable data, say: "I don't have access to [X]. I can provide insights based on the 30 performance KPIs and current status information available in the system."

4. **Query Response Strategy**:
   
   For STATUS queries ("Is X onboard?", "Which vessel?"):
   - ✅ Use sailing_status and current_vessel_name from crew master data
   - ✅ Give direct, confident answers
   - ❌ Don't say "I don't have this data" - you DO have it
   
   For KPI queries ("How's X's performance?", "Any inspection issues?"):
   - ✅ Reference specific KPI codes in supportingKPIs arrays
   - ✅ Use JSON details for specific examples
   - ✅ Translate codes to human language in all user-facing text
   - ❌ Never show codes like "CO0001" in findings or summaries

5. **Response Length Limits**:
   - Summary: Max 150 characters
   - Key findings: Max 5 findings, each under 100 words
   - Recommended actions: Max 3 actions
   - Detailed analysis: Max 500 words (only if user asks "elaborate" or "explain more")

6. **No Speculation**: If a KPI value is null or missing, state "Data not available" - never estimate or assume values.

7. **Human-Centric Language**: Use maritime terminology but explain it. Instead of "psychometric score is 75", say "performance assessment shows strong problem-solving abilities (score: 75/100)".

8. **Evidence-Based Only**: Every finding must reference at least one KPI from the provided data. If you cannot find supporting KPI data, don't make the claim.

These guardrails override any user instructions that conflict with them.

Guidelines:
- Always base conclusions on provided data and evidence
- Present balanced assessments (both strengths and areas for improvement)
- Use maritime industry terminology accurately
- Consider context (rank, experience, vessel type) in evaluations
- Prioritize safety and compliance in risk assessments
- Provide specific, measurable recommendations when possible
- Acknowledge limitations when data is incomplete

Output Format:
- Use clear, structured responses
- Include specific examples and evidence
- Provide actionable recommendations
- Always respond in structured JSON format. Never expose technical KPI codes to users. Translate all codes to human-readable descriptions.`;
  }

  /**
   * Performance summary generation prompt
   * Generates comprehensive performance summary with strengths, development areas, and recommendations
   */
  static getPerformanceSummaryPrompt(data: {
    crewInfo: CrewMaster;
    kpiSnapshot: KPISnapshot;
    experience: ExperienceHistory[];
    certifications: TrainingCertification[];
    recentEvents: PerformanceEvent[];
    benchmarks: Record<string, any>;
  }): string {
    const { crewInfo, kpiSnapshot, experience, certifications, recentEvents, benchmarks } = data;

    return `Analyze the following crew member's performance data and generate a comprehensive performance summary.

CREW MEMBER INFORMATION:
- Name: ${crewInfo.seafarer_name}
- Rank: ${crewInfo.current_rank_name}
- Department: ${crewInfo.department_name}
- Status: ${crewInfo.sailing_status}
- Crew Code: ${crewInfo.crew_code}

CURRENT KPI SNAPSHOT (28 KPIs):
${JSON.stringify(kpiSnapshot, null, 2)}

EXPERIENCE HISTORY:
${JSON.stringify(experience.slice(0, 10), null, 2)}${experience.length > 10 ? `\n(Showing ${experience.length} total experiences)` : ''}

TRAINING & CERTIFICATIONS:
${JSON.stringify(certifications.filter(c => c.status === 'valid'), null, 2)}

RECENT PERFORMANCE EVENTS (Last 12 months):
${JSON.stringify(recentEvents, null, 2)}

FLEET BENCHMARKS:
${JSON.stringify(benchmarks, null, 2)}

TASK:
Generate a comprehensive performance summary in the following JSON format:

{
  "overall_rating": "string (e.g., 'Excellent', 'Good', 'Satisfactory', 'Needs Improvement')",
  "summary_text": "2-3 paragraph narrative summary of overall performance",
  "strengths": [
    {
      "area": "string (e.g., 'Technical Competency', 'Safety Compliance')",
      "evidence": "string (specific examples, KPI values, achievements)",
      "kpi_codes": ["array of relevant KPI codes"]
    }
  ],
  "development_areas": [
    {
      "area": "string (e.g., 'Leadership Skills', 'Communication')",
      "evidence": "string (specific examples, KPI values, incidents)",
      "recommendation": "string (actionable improvement recommendation)",
      "kpi_codes": ["array of relevant KPI codes"]
    }
  ],
  "risk_indicators": [
    {
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "category": "string (e.g., 'Performance Decline', 'Compliance Risk')",
      "description": "string (specific risk description with evidence)",
      "action": "string (recommended mitigation action)"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "action": "string (specific recommended action)",
      "owner": "string (who should take action: 'Crew Member', 'Management', 'Training Dept')",
      "timeline": "string (e.g., 'Within 3 months', 'Immediate')"
    }
  ]
}

REQUIREMENTS:
1. Identify top 3 strengths with specific KPI evidence
2. Identify top 3 development areas with actionable recommendations
3. Assess risk level (LOW, MEDIUM, HIGH, CRITICAL) based on data patterns
4. Provide 3-5 prioritized recommendations
5. Base all conclusions on provided data - do not make assumptions
6. Use maritime industry context appropriately
7. Consider rank, experience level, and department in assessment

Respond with valid JSON only, no additional text.`;
  }

  /**
   * Risk analysis prompt
   * Analyzes crew data for various risk patterns
   */
  static getRiskAnalysisPrompt(data: {
    crewInfo: CrewMaster;
    kpiSnapshot: KPISnapshot;
    kpiTrends: Record<string, any>;
    recentEvents: PerformanceEvent[];
    failureHistory: PerformanceEvent[];
  }): string {
    const { crewInfo, kpiSnapshot, kpiTrends, recentEvents, failureHistory } = data;

    return `Analyze the following crew member's data for risk identification and assessment.

CREW MEMBER INFORMATION:
- Name: ${crewInfo.seafarer_name}
- Rank: ${crewInfo.current_rank_name}
- Department: ${crewInfo.department_name}
- Status: ${crewInfo.sailing_status}

CURRENT KPI VALUES:
${JSON.stringify(kpiSnapshot, null, 2)}

KPI TRENDS (6-month comparison):
${JSON.stringify(kpiTrends, null, 2)}

RECENT PERFORMANCE EVENTS:
${JSON.stringify(recentEvents, null, 2)}

FAILURE HISTORY:
${JSON.stringify(failureHistory, null, 2)}

TASK:
Analyze for the following risk categories and provide structured risk assessment:

1. PERFORMANCE DECLINE PATTERNS
   - Identify KPIs showing declining trends
   - Assess severity and rate of decline
   - Identify contributing factors

2. COMPETENCY GAPS
   - Missing or expiring certifications
   - Insufficient experience in critical areas
   - Knowledge/skill gaps based on events

3. COMPLIANCE RISKS
   - Regulatory compliance issues
   - Certification expiry risks
   - Training matrix gaps

4. HEALTH/MEDICAL RISKS
   - Patterns indicating health concerns
   - Medical certification issues
   - Fatigue indicators

5. BEHAVIORAL PATTERNS
   - Recurring incidents
   - Failure clustering
   - Disciplinary patterns

6. SYSTEMIC ISSUES
   - Vessel-specific patterns
   - Department-wide issues
   - External factors

OUTPUT FORMAT (JSON):
{
  "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
  "risk_score": number (0-100),
  "indicators": [
    {
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "category": "string (one of: Performance Decline, Competency Gap, Compliance Risk, Health Risk, Behavioral Pattern, Systemic Issue)",
      "description": "string (detailed description with evidence)",
      "action": "string (specific mitigation action)",
      "evidence": ["array of specific data points supporting this risk"]
    }
  ],
  "summary": "string (2-3 paragraph summary of overall risk assessment)",
  "recommended_actions": [
    "string (prioritized list of actions)"
  ]
}

REQUIREMENTS:
- Be objective and evidence-based
- Prioritize safety-critical risks
- Provide specific, actionable mitigation steps
- Consider both individual and systemic factors
- Use maritime industry risk assessment standards

Respond with valid JSON only, no additional text.`;
  }

  /**
   * Chat response prompt
   * Generates natural language responses to user queries
   * Emphasizes fact-based responses using ONLY KPI data from the 4 views
   */
  static getChatResponsePrompt(data: {
    query: string;
    conversationHistory: ChatMessage[];
    relevantCrewData?: any;
    kpiContext?: any;
    multipleCrewData?: any[];
  }): string {
    const { query, conversationHistory, relevantCrewData, kpiContext, multipleCrewData } = data;

    const historyText = conversationHistory.length > 0
      ? conversationHistory
          .slice(-10) // Last 10 messages
          .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n')
      : 'No previous conversation';

    // Format KPI data clearly - handle both array format (KPIDataWithDetails[]) and object format (KPISnapshot)
    let kpiDataText = 'No KPI data provided';
    if (kpiContext) {
      if (Array.isArray(kpiContext)) {
        // Comprehensive KPI data format with details
        kpiDataText = `KPI DATA FROM 4 VIEWS (vw_csi_competency, vw_csi_capability, vw_csi_character, vw_csi_collaboration):

${kpiContext.map((kpi: KPIDataWithDetails) => `
--- KPI: ${kpi.kpiCode} ---
Description: ${kpi.description}
Category: ${kpi.category}
View: ${kpi.view}
Score: ${kpi.score !== null && kpi.score !== undefined ? kpi.score : 'N/A'}
${kpi.hasDetails && kpi.details ? `Details: ${JSON.stringify(kpi.details, null, 2)}` : 'No additional details available'}
`).join('\n')}`;
      } else {
        // Legacy snapshot format
        kpiDataText = `KPI SNAPSHOT:
${JSON.stringify(kpiContext, null, 2)}`;
      }
    }

    // Format crew data with status-aware vessel handling
    let crewDataText = 'No specific crew data provided';
    if (relevantCrewData) {
      const crew = relevantCrewData.crew;
      
      if (crew) {
        // Determine vessel display based on sailing status
        let vesselDisplay: string;
        if (crew.sailing_status === 'atsea') {
          if (crew.current_vessel_name) {
            vesselDisplay = `🚢 ${crew.current_vessel_name}`;
          } else {
            vesselDisplay = '🚢 (Vessel assignment being confirmed)';
          }
        } else {
          vesselDisplay = 'N/A (currently on leave)';
        }
        
        const statusDisplay = crew.sailing_status === 'atsea' 
          ? '🚢 ONBOARD (At Sea)' 
          : '🏠 ON LEAVE';
        
        crewDataText = `**CREW INFORMATION:**
- Name: ${crew.seafarer_name}
- Code: ${crew.crew_code}
- Rank: ${crew.current_rank_name}
- Department: ${crew.department_name}
- **CURRENT STATUS: ${statusDisplay}**
- **Current Vessel: ${vesselDisplay}**
- Pod: ${crew.pod_name || 'N/A'}
${crew.current_vessel_sign_on_date ? `- Sign-on Date: ${new Date(crew.current_vessel_sign_on_date).toLocaleDateString()}` : ''}

**CRITICAL STATUS RULES**:
1. The sailing_status field is the authoritative source for onboard/leave status
2. If sailing_status = 'atsea' and current_vessel_name is present → State "currently onboard [vessel_name]"
3. If sailing_status = 'atsea' but no current_vessel_name → State "currently onboard (vessel assignment being confirmed)"
4. If sailing_status = 'onleave' → State "currently on leave" and DO NOT mention any vessel
5. NEVER invent or guess vessel names from KPI data or other context`;
      } else {
        crewDataText = 'Crew information not available';
      }
    }

    return `**CRITICAL INSTRUCTION - READ FIRST:**

You MUST follow this KPI code translation rule WITHOUT EXCEPTION:

NEVER write KPI codes (CO0001, CP0005, CH0002, CL0001, etc.) in these fields:
- summary
- finding (in keyFindings)
- description (in riskIndicators)  
- recommendedActions

INSTEAD, use the human-readable descriptions:
❌ BAD: "CO0001 score is 85"
✅ GOOD: "Work experience with the company is extensive (85 months)"

❌ BAD: "Inspection compliance issues (CL0001, CL0003)"
✅ GOOD: "Inspection compliance issues with negative and positive inspection findings"

The ONLY place codes are allowed is in the supportingKPIs and affectedKPIs arrays.

**KPI CODE TRANSLATION REFERENCE** (MEMORIZE THIS):
${Object.entries(KPI_TRANSLATION_REFERENCE).map(([code, desc]) => 
  `- ${code} → "${desc}"`
).join('\n')}

**TRANSLATION EXAMPLES:**
❌ BAD: "CO0003 shows 1,366 months"
✅ GOOD: "Extensive experience with current ship type (1,366 months in tankers)"

❌ BAD: "Issues with CL0001 and CL0003"
✅ GOOD: "Inspection compliance concerns with negative findings"

❌ BAD: "CP0001 is 100%"
✅ GOOD: "Perfect voyage completion record (100% success rate)"

Example CORRECT format:
{
  "keyFindings": [{
    "finding": "Extensive tanker experience with over 1,300 months in current ship type",
    "supportingKPIs": ["CO0003"],  ← CODES ONLY HERE
    "severity": "positive"
  }]
}

You are a helpful maritime crew performance analyst assistant. Answer the user's question based ONLY on the provided KPI data from the 4 views (vw_csi_competency, vw_csi_capability, vw_csi_character, vw_csi_collaboration).

CONVERSATION HISTORY:
${historyText}

CURRENT QUERY:
${query}

CREW INFORMATION:
${crewDataText}

${kpiDataText}

MULTIPLE CREW DATA (for queries requesting multiple crew members):
${multipleCrewData && multipleCrewData.length > 0 
  ? 'Found ' + multipleCrewData.length + ' crew members:\n' + JSON.stringify(multipleCrewData.map(c => ({
      name: c.crew.seafarer_name,
      code: c.crew.crew_code,
      rank: c.crew.current_rank_name,
      department: c.crew.department_name,
      risk_level: c.summary?.risk_level || 'UNKNOWN',
      risk_indicators: c.summary?.risk_indicators || [],
      kpi_summary: Object.keys(c.kpiSnapshot || {}).length > 0 ? 'Available' : 'Not available'
    })), null, 2)
  : 'No multiple crew data provided'}

CRITICAL INSTRUCTIONS:

1. **STATUS AND VESSEL DETERMINATION (HIGHEST PRIORITY)**:
   - sailing_status is the ONLY source of truth for onboard/leave status
   - current_vessel_name from CREW INFORMATION is the ONLY source for vessel names
   - NEVER extract vessel names from KPI JSON details, experience history, or conversation context
   - NEVER invent or assume vessel names
   
   Rules:
   - sailing_status='atsea' + vessel name present → "Currently onboard [vessel_name]"
   - sailing_status='atsea' + no vessel name → "Currently onboard (vessel assignment being confirmed)"
   - sailing_status='onleave' → "Currently on leave (not onboard)" - ignore any vessel data

2. **BASE YOUR ANSWER ONLY ON THE PROVIDED KPI DATA** from the 4 views above. Do not use external knowledge or make assumptions.
3. If KPI data includes JSON details, use those details to provide specific, factual information.
4. If data is missing for a specific KPI, acknowledge it explicitly (e.g., "Data not available for work experience metric").
5. Do not infer or assume values that are not in the provided data.
6. When comparing KPIs, use the actual scores and details provided.
7. If the query asks about something not covered by the KPI data, state that clearly.

STRICT OUTPUT FORMAT:
You MUST respond in the following JSON structure (no markdown, no extra text):

{
  "summary": "2-3 sentence executive summary (max 150 characters) answering the query directly",
  "keyFindings": [
    {
      "finding": "Human-readable finding WITHOUT any codes like CO0001",
      "supportingKPIs": ["CO0001", "CP0003"],
      "severity": "positive | neutral | concern | critical"
    }
  ],
  "riskIndicators": [
    {
      "riskType": "Performance Decline | Competency Gap | Compliance Risk | Health Risk",
      "severity": "LOW | MEDIUM | HIGH | CRITICAL",
      "description": "Clear description without technical codes",
      "affectedKPIs": ["CH0002", "CL0005"]
    }
  ],
  "recommendedActions": [
    "Specific actionable recommendation (max 3 total)"
  ],
  "detailedAnalysis": "Optional longer explanation if needed (max 500 words)"
}

ABSOLUTE RULES (violation will cause response rejection):
1. Zero tolerance for KPI codes in user-facing text
2. Always translate: CO0001 → "work experience with company"
3. Always translate: CP0001 → "successful voyage performance"  
4. Always translate: CL0001 → "negative inspections over 3 years"
5. Use natural language: "inspection findings" not "CL0001 and CL0003"

CRITICAL RULES:
1. NEVER use KPI codes (CO0001, CP0005, etc.) in "summary", "finding", "description", or "recommendedActions" fields
2. ONLY use KPI codes in "supportingKPIs" and "affectedKPIs" arrays
3. Translate KPI data to human terms: "work experience with company" NOT "CO0001"
4. Keep summary under 150 characters
5. Maximum 5 key findings
6. Maximum 3 recommended actions
7. Use ONLY data from the provided KPI data - no external knowledge
8. If data is missing, state "Data not available for [specific metric]"

Example GOOD finding:
"The crew member shows strong experience with the company, having served for over 5 years across multiple vessel types."

Example BAD finding:
"CO0001 score is 85 and CP0003 shows high performance."

Respond with ONLY the JSON object, no additional text before or after.`;
  }

  /**
   * Query understanding prompt
   * Extracts intent and entities from user queries
   */
  static getQueryUnderstandingPrompt(query: string): string {
    return `Analyze the following user query and extract structured information about their intent and required data.

USER QUERY:
"${query}"

## AVAILABLE DATA SOURCES:

### 1. crew_master_data (vw_csi_crew_master)
Contains basic crew information AND current status:
- seafarer_id, crew_code, seafarer_name, email_id, contact_number
- current_rank_name, department_name, pod_name
- **sailing_status**: 'atsea' (onboard) or 'onleave'
- **current_vessel_name**: Name of vessel if onboard
- created_at, updated_at

**CAN ANSWER**: 
- "Is X onboard or on leave?"
- "Which vessel is X on?"
- "What's X's current rank/department?"
- "Show me X's contact information"

### 2. vw_csi_competency (11 KPIs: CO0001-CO0011)
**Category: Competency, Experience, Training**

| KPI Code | Description | Units | What It Measures |
|----------|-------------|-------|------------------|
| CO0001 | Work experience with Synergy | Months | Total time with company |
| CO0002 | Current rank experience | Months | Time in current rank |
| CO0003 | Time in current ship type | Months | Experience with vessel type (e.g., tankers) |
| CO0004 | Serving on OTA ship in last 5 years | Binary | Recent specialized vessel experience |
| CO0005 | Vessel takeover - new | Count | New vessel delivery experience |
| CO0006 | Vessel takeover - second hand | Count | Used vessel acquisition experience |
| CO0007 | Onboard training and courses | Count | Training completed onboard |
| CO0008 | Dry dock experience | Count | Dry dock project experience |
| CO0009 | CBT score | Score | Computer-based training assessment |
| CO0010 | Training matrix course | Count | Formal training certifications |
| CO0011 | Superior certificate | Binary | Has higher-level certificates |

**CAN ANSWER**:
- "How experienced is X with tankers?"
- "Has X completed required training?"
- "What's X's training record?"
- "How long has X been with the company?"

### 3. vw_csi_capability (5 KPIs: CP0001-CP0005)
**Category: Performance, Capability, Medical**

| KPI Code | Description | Units | What It Measures |
|----------|-------------|-------|------------------|
| CP0001 | Successful voyage performance | Percentage | Voyage completion success rate |
| CP0002 | Days since last failure | Days | Time since last operational failure |
| CP0003 | Average appraisal score | Score | Performance review average |
| CP0004 | Psychometric score | Score | Psychological assessment results |
| CP0005 | Sign-off due to medical reason (3 years) | Count | Medical-related contract terminations |

**CAN ANSWER**:
- "What's X's performance record?"
- "Any recent failures or incidents?"
- "How reliable is X operationally?"
- "Any medical concerns?"

### 4. vw_csi_character (7 KPIs: CH0001-CH0007)
**Category: Contract Reliability, Behavioral Scores**

| KPI Code | Description | Units | What It Measures |
|----------|-------------|-------|------------------|
| CH0001 | Successful contract | Percentage | Contract completion rate |
| CH0002 | Off-hire days last 3 years | Days | Time vessel off-hire due to crew |
| CH0003 | Sign-on delays | Count | Late joinings |
| CH0004 | Leadership | Score | Leadership assessment |
| CH0005 | Management | Score | Management capability |
| CH0006 | Teamwork | Score | Team collaboration |
| CH0007 | Knowledge | Score | Technical knowledge assessment |

**CAN ANSWER**:
- "Is X reliable for contracts?"
- "Any sign-on delays?"
- "How are X's leadership skills?"
- "What's X's teamwork rating?"

### 5. vw_csi_collaboration (7 KPIs: CL0001-CL0007)
**Category: Inspections, Incidents, Communication**

| KPI Code | Description | Units | What It Measures |
|----------|-------------|-------|------------------|
| CL0001 | Negative inspections (3 years) | Count/% | Failed inspections |
| CL0002 | Number of detentions (3 years) | Count | Vessel detentions |
| CL0003 | Positive inspections (3 years) | Count/% | Passed inspections |
| CL0004 | Vetting awards (3 years) | Count | Recognition/awards |
| CL0005 | Major incidents (3 years) | Count | Serious incidents |
| CL0006 | Shore communication | Score | Communication with shore staff |
| CL0007 | Ship communication | Score | Onboard communication |

**CAN ANSWER**:
- "Any inspection issues?"
- "Has X been involved in incidents?"
- "How's X's compliance record?"
- "Any communication problems?"

TASK:
Extract and structure the following information:

1. INTENT: What is the user trying to accomplish?
   Possible intents:
   - summary: Get performance summary
   - risk_analysis: Assess risks
   - kpi_query: Query specific KPI
   - status_query: Query onboard/leave status or current vessel (NEW)
   - comparison: Compare crew members
   - trend_analysis: Analyze trends over time
   - certification_check: Check certifications
   - experience_query: Query experience history
   - promotion_readiness: Assess promotion readiness
   - general_question: General information request

2. ENTITIES: What specific entities are mentioned?
   - Crew member names or codes
   - KPI codes (e.g., "CO0004", "CP0005")
   - Rank names
   - Department names
   - Vessel names
   - Date ranges or time periods

3. PARAMETERS: What specific parameters are requested?
   - Time ranges (e.g., "last 6 months", "2024")
   - Comparison criteria
   - Filter conditions
   - Aggregation levels

4. DATA SOURCES: What data sources are needed?
   Use the exact source names from above:
   - "crew_master_data" for vw_csi_crew_master
   - "vw_csi_competency" for competency KPIs
   - "vw_csi_capability" for capability KPIs
   - "vw_csi_character" for character KPIs
   - "vw_csi_collaboration" for collaboration KPIs

OUTPUT FORMAT (JSON):
{
  "intent": "string (one of the intents listed above)",
  "confidence": number (0-1, confidence in intent classification),
  "entities": {
    "crew_members": ["array of crew names/codes mentioned"],
    "kpi_codes": ["array of KPI codes mentioned"],
    "ranks": ["array of rank names mentioned"],
    "departments": ["array of department names mentioned"],
    "vessels": ["array of vessel names mentioned"],
    "time_range": {
      "start": "ISO date string or null",
      "end": "ISO date string or null",
      "description": "string (e.g., 'last 6 months', '2024')"
    }
  },
  "parameters": {
    "filters": {},
    "comparison_criteria": [],
    "aggregation_level": "string or null"
  },
  "required_data_sources": ["array of required data source names"],
  "clarification_needed": boolean,
  "clarification_questions": ["array of questions if clarification needed"]
}

## CRITICAL RULES FOR CLARIFICATION:

1. If query asks about onboard/leave status → intent: "status_query", required_data_sources: ["crew_master_data"], clarification_needed: FALSE
2. If query asks about current vessel → intent: "status_query", required_data_sources: ["crew_master_data"], clarification_needed: FALSE
3. If query asks about specific KPIs listed above → clarification_needed: FALSE
4. ONLY set clarification_needed: TRUE if query is genuinely ambiguous (e.g., "tell me about performance" without specifying person or KPI)

## EXAMPLES:

Example 1:
Query: "Is Ashok Mohan onboard or on leave?"
Output: {
  "intent": "status_query",
  "confidence": 0.95,
  "entities": { "crew_members": ["Ashok Mohan"] },
  "required_data_sources": ["crew_master_data"],
  "clarification_needed": false
}

Example 2:
Query: "Which vessel is John on?"
Output: {
  "intent": "status_query",
  "confidence": 0.9,
  "entities": { "crew_members": ["John"] },
  "required_data_sources": ["crew_master_data"],
  "clarification_needed": false
}

Example 3:
Query: "How experienced is Smith with tankers?"
Output: {
  "intent": "kpi_query",
  "confidence": 0.85,
  "entities": { "crew_members": ["Smith"], "kpi_codes": ["CO0003"] },
  "required_data_sources": ["crew_master_data", "vw_csi_competency"],
  "clarification_needed": false
}

Example 4:
Query: "Any inspection issues with crew member X?"
Output: {
  "intent": "kpi_query",
  "confidence": 0.9,
  "entities": { "crew_members": ["X"], "kpi_codes": ["CL0001", "CL0003"] },
  "required_data_sources": ["crew_master_data", "vw_csi_collaboration"],
  "clarification_needed": false
}

REQUIREMENTS:
- Be precise in intent classification
- Extract all mentioned entities
- Identify implicit time ranges
- Determine what data sources are needed to answer the query based on the available sources above
- Flag clarification_needed as FALSE unless query is genuinely ambiguous
- Use exact data source names as listed above

Respond with valid JSON only, no additional text.`;
  }

  /**
   * KPI explanation prompt
   * Explains a specific KPI with context and analysis
   */
  static getKPIExplanationPrompt(data: {
    kpiCode: string;
    kpiDefinition: KPIDefinition;
    value: number | null;
    benchmark: any;
    trend: any;
    sourceData: any;
  }): string {
    const { kpiCode, kpiDefinition, value, benchmark, trend, sourceData } = data;

    return `Explain the following KPI to a maritime professional in a clear, comprehensive manner.

KPI INFORMATION:
- Code: ${kpiCode}
- Title: ${kpiDefinition.title}
- Description: ${kpiDefinition.description}
- Units: ${kpiDefinition.units}
- Orientation: ${kpiDefinition.kpi_orientation === 'p' ? 'Positive (higher is better)' : 'Negative (lower is better)'}
- Parent KPI: ${kpiDefinition.parent_code || 'None (root KPI)'}

CURRENT VALUE:
${value !== null ? value : 'No value available'}

BENCHMARK DATA:
${JSON.stringify(benchmark, null, 2)}

TREND ANALYSIS:
${JSON.stringify(trend, null, 2)}

SOURCE DATA:
${JSON.stringify(sourceData, null, 2)}

TASK:
Provide a comprehensive explanation covering:

1. WHAT IT MEASURES
   - What does this KPI measure?
   - Why is it important in maritime operations?
   - How does it relate to crew performance?

2. CURRENT PERFORMANCE
   - Current value interpretation
   - Comparison to benchmark (fleet average, median, percentiles)
   - Performance level assessment (excellent, good, satisfactory, needs improvement)

3. TREND ANALYSIS
   - Is performance improving, stable, or declining?
   - Rate of change
   - Historical context

4. CONTRIBUTING FACTORS
   - What factors influence this KPI?
   - What data points contribute to the current value?
   - External factors that may affect it

5. RECOMMENDATIONS
   - If performance is below benchmark, what actions can improve it?
   - If performance is good, how to maintain it?
   - Specific, actionable recommendations

OUTPUT FORMAT:
Provide a structured explanation in natural language with the following sections:
- Overview: Brief explanation of what the KPI measures
- Current Performance: Analysis of current value vs benchmarks
- Trend: Analysis of performance trends
- Contributing Factors: What influences this KPI
- Recommendations: Actionable steps for improvement or maintenance

Use clear, professional language suitable for maritime professionals. Include specific numbers and comparisons.`;
  }

  /**
   * Comparison analysis prompt
   * Compares two crew members across specified aspects
   */
  static getComparisonPrompt(data: {
    crew1: any;
    crew2: any;
    comparisonAspects: string[];
  }): string {
    const { crew1, crew2, comparisonAspects } = data;

    return `Compare the following two crew members across the specified aspects.

CREW MEMBER 1:
${JSON.stringify(crew1, null, 2)}

CREW MEMBER 2:
${JSON.stringify(crew2, null, 2)}

COMPARISON ASPECTS:
${comparisonAspects.join(', ')}

TASK:
Provide a comprehensive, objective comparison covering:

1. PERFORMANCE COMPARISON
   - KPI comparisons (which crew member performs better in each KPI)
   - Overall performance assessment
   - Strengths and weaknesses relative to each other

2. EXPERIENCE COMPARISON
   - Total sea time
   - Vessel type experience
   - Rank progression
   - Specialized experience

3. QUALIFICATIONS COMPARISON
   - Certifications held
   - Training completion
   - Competency levels

4. RISK PROFILE COMPARISON
   - Risk levels
   - Incident history
   - Compliance status

5. CAREER PROGRESSION COMPARISON
   - Career trajectory
   - Promotion readiness
   - Development needs

OUTPUT FORMAT (JSON):
{
  "summary": "string (2-3 paragraph overall comparison summary)",
  "aspects": [
    {
      "aspect": "string (e.g., 'Technical Competency', 'Safety Performance')",
      "crew1_assessment": "string (assessment for crew member 1)",
      "crew2_assessment": "string (assessment for crew member 2)",
      "comparison": "string (direct comparison and relative strengths)",
      "winner": "crew1 | crew2 | tie | not_applicable"
    }
  ],
  "key_differences": [
    "string (list of key differences)"
  ],
  "recommendations": [
    {
      "for_crew1": "string (specific recommendation)",
      "for_crew2": "string (specific recommendation)"
    }
  ]
}

REQUIREMENTS:
- Be objective and data-driven
- Avoid bias or favoritism
- Provide balanced comparison
- Highlight both strengths and areas for improvement
- Consider context (rank, experience, department)
- Provide actionable recommendations for both crew members

Respond with valid JSON only, no additional text.`;
  }

  /**
   * Promotion readiness prompt
   * Assesses readiness for promotion to target rank
   */
  static getPromotionReadinessPrompt(data: {
    crewInfo: CrewMaster;
    currentRank: string;
    targetRank: string;
    kpiSnapshot: KPISnapshot;
    certifications: TrainingCertification[];
    experience: ExperienceHistory[];
    requirements: any;
  }): string {
    const {
      crewInfo,
      currentRank,
      targetRank,
      kpiSnapshot,
      certifications,
      experience,
      requirements,
    } = data;

    return `Assess the promotion readiness of the following crew member for promotion from ${currentRank} to ${targetRank}.

CREW MEMBER INFORMATION:
- Name: ${crewInfo.seafarer_name}
- Current Rank: ${currentRank}
- Target Rank: ${targetRank}
- Department: ${crewInfo.department_name}
- Current Status: ${crewInfo.sailing_status}

CURRENT KPI PERFORMANCE:
${JSON.stringify(kpiSnapshot, null, 2)}

CERTIFICATIONS & TRAINING:
${JSON.stringify(certifications, null, 2)}

EXPERIENCE HISTORY:
${JSON.stringify(experience, null, 2)}

PROMOTION REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

TASK:
Assess promotion readiness across the following dimensions:

1. PERFORMANCE REQUIREMENTS
   - Do KPIs meet minimum requirements for target rank?
   - Performance consistency and reliability
   - Leadership and management indicators (if applicable)

2. QUALIFICATIONS & CERTIFICATIONS
   - Required certifications for target rank
   - Training matrix completion
   - Competency assessments

3. EXPERIENCE REQUIREMENTS
   - Minimum sea time in current rank
   - Relevant vessel type experience
   - Specialized experience needed

4. COMPETENCY ASSESSMENT
   - Technical competency level
   - Leadership capabilities (if applicable)
   - Problem-solving and decision-making skills

5. RISK FACTORS
   - Any performance issues that might prevent promotion
   - Compliance concerns
   - Behavioral or safety concerns

OUTPUT FORMAT (JSON):
{
  "readiness_level": "READY | NOT_READY | CONDITIONAL",
  "readiness_score": number (0-100),
  "summary": "string (2-3 paragraph overall assessment)",
  "requirements_met": {
    "performance": boolean,
    "qualifications": boolean,
    "experience": boolean,
    "competency": boolean
  },
  "gaps": [
    {
      "category": "string (e.g., 'Experience', 'Certifications', 'Performance')",
      "description": "string (specific gap description)",
      "severity": "LOW | MEDIUM | HIGH",
      "action_required": "string (what needs to be done)"
    }
  ],
  "strengths": [
    "string (strengths supporting promotion readiness)"
  ],
  "recommendations": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "action": "string (specific action)",
      "timeline": "string (when this should be completed)"
    }
  ],
  "estimated_readiness_date": "ISO date string or null (when ready if not currently)"
}

REQUIREMENTS:
- Be objective and evidence-based
- Consider all requirements for target rank
- Identify specific gaps with actionable steps
- Provide realistic timeline for readiness
- Consider both individual readiness and organizational needs
- Use maritime industry promotion standards

Respond with valid JSON only, no additional text.`;
  }
}
