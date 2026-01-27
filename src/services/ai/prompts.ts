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

2. **Data Boundary**: You can ONLY use data from the 28 KPIs across 4 views:
   - vw_csi_competency (11 KPIs: CO0001-CO0011) - Experience, Training, Certifications
   - vw_csi_capability (5 KPIs: CP0001-CP0005) - Performance, Medical
   - vw_csi_character (7 KPIs: CH0001-CH0007) - Contract, Behavioral
   - vw_csi_collaboration (7 KPIs: CL0001-CL0007) - Inspections, Communication
   
   If a query asks about data outside these 28 KPIs, state: "I don't have data on [requested information]. I can only analyze the 28 performance KPIs available in the system."

3. **Response Length Limits**:
   - Summary: Max 150 characters
   - Key findings: Max 5 findings, each under 100 words
   - Recommended actions: Max 3 actions
   - Detailed analysis: Max 500 words (only if user asks "elaborate" or "explain more")

4. **No Speculation**: If a KPI value is null or missing, state "Data not available" - never estimate or assume values.

5. **Human-Centric Language**: Use maritime terminology but explain it. Instead of "psychometric score is 75", say "performance assessment shows strong problem-solving abilities (score: 75/100)".

6. **Evidence-Based Only**: Every finding must reference at least one KPI from the provided data. If you cannot find supporting KPI data, don't make the claim.

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

    // Format crew data
    let crewDataText = 'No specific crew data provided';
    if (relevantCrewData) {
      const crewInfo = relevantCrewData.crew ? {
        name: relevantCrewData.crew.seafarer_name,
        code: relevantCrewData.crew.crew_code,
        rank: relevantCrewData.crew.current_rank_name,
        department: relevantCrewData.crew.department_name,
        status: relevantCrewData.crew.sailing_status,
      } : null;
      
      crewDataText = crewInfo ? JSON.stringify(crewInfo, null, 2) : 'Crew information not available';
    }

    return `You are a helpful maritime crew performance analyst assistant. Answer the user's question based ONLY on the provided KPI data from the 4 views (vw_csi_competency, vw_csi_capability, vw_csi_character, vw_csi_collaboration).

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
1. **BASE YOUR ANSWER ONLY ON THE PROVIDED KPI DATA** from the 4 views above. Do not use external knowledge or make assumptions.
2. If KPI data includes JSON details, use those details to provide specific, factual information.
3. If data is missing for a specific KPI, acknowledge it explicitly (e.g., "Data not available for work experience metric").
4. Do not infer or assume values that are not in the provided data.
5. When comparing KPIs, use the actual scores and details provided.
6. If the query asks about something not covered by the KPI data, state that clearly.

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

TASK:
Extract and structure the following information:

1. INTENT: What is the user trying to accomplish?
   Possible intents:
   - summary: Get performance summary
   - risk_analysis: Assess risks
   - kpi_query: Query specific KPI
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
   - Crew master data
   - KPI values
   - Experience history
   - Certifications
   - Performance events
   - Appraisals
   - AI summaries

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

REQUIREMENTS:
- Be precise in intent classification
- Extract all mentioned entities
- Identify implicit time ranges
- Determine what data sources are needed to answer the query
- Flag if query is ambiguous and needs clarification

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
