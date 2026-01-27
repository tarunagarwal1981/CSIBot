/**
 * Response Formatter Service
 * Formats raw AI responses into structured, traceable chat responses
 * @module services/ai/responseFormatter
 */

import type {
  StructuredChatResponse,
  KeyFinding,
  KPIReference,
  RiskIndicatorSummary,
} from '../../types/chatResponse';
import type { KPIDataWithDetails } from '../../types/database';
import {
  getKPIColumnMapping,
  ALL_KPI_COLUMNS,
} from '../../config/kpiColumnMapping';

/**
 * Response Formatter
 * Converts raw AI responses into structured, traceable formats
 */
export default class ResponseFormatter {
  /**
   * Translate KPI code to human-readable description
   * @param kpiCode KPI code (e.g., 'CO0001', 'CP0003')
   * @returns Human-readable description or 'Unknown KPI'
   */
  static translateKPICodeToHuman(kpiCode: string): string {
    const mapping = getKPIColumnMapping(kpiCode);
    return mapping?.description || 'Unknown KPI';
  }

  /**
   * Extract KPI references from raw response text
   * Scans for KPI codes and creates KPIReference objects with context
   * @param rawResponse Raw AI response text
   * @param kpiData Array of KPI data with details
   * @returns Array of KPI references found in the response
   */
  static extractKPIReferences(
    rawResponse: string,
    kpiData: KPIDataWithDetails[]
  ): KPIReference[] {
    // Regex pattern to match KPI codes: CO####, CP####, CH####, CL####
    const kpiCodePattern = /\b(CO|CP|CH|CL)\d{4}\b/g;
    const foundCodes = new Set<string>();
    
    // Find all KPI codes in the response
    let match;
    while ((match = kpiCodePattern.exec(rawResponse)) !== null) {
      foundCodes.add(match[0]);
    }

    // Build KPI references from found codes
    const references: KPIReference[] = [];
    
    for (const kpiCode of foundCodes) {
      // Look up in kpiData array
      const kpiInfo = kpiData.find(k => k.kpiCode === kpiCode);
      
      if (kpiInfo) {
        // Get human-readable name from mapping
        const mapping = getKPIColumnMapping(kpiCode);
        const humanReadableName = mapping?.description || kpiCode;
        
        // Generate interpretation based on score thresholds
        const interpretation = this.interpretKPIScore(kpiInfo.score);
        
        references.push({
          kpiCode,
          humanReadableName,
          category: kpiInfo.category,
          score: kpiInfo.score,
          interpretation,
        });
      } else {
        // KPI code found in response but not in data - still create reference
        const mapping = getKPIColumnMapping(kpiCode);
        references.push({
          kpiCode,
          humanReadableName: mapping?.description || kpiCode,
          category: mapping?.category || 'Unknown',
          score: null,
          interpretation: 'Data not available',
        });
      }
    }

    return references;
  }

  /**
   * Interpret KPI score with thresholds
   * @param score KPI score value
   * @returns Human-readable interpretation
   */
  private static interpretKPIScore(score: number | null): string {
    if (score === null || score === undefined) {
      return 'Data not available';
    }

    if (score >= 80) {
      return 'Excellent performance';
    } else if (score >= 60) {
      return 'Good performance';
    } else if (score >= 40) {
      return 'Satisfactory performance';
    } else if (score >= 20) {
      return 'Needs attention';
    } else {
      return 'Critical - requires immediate action';
    }
  }

  /**
   * Strip technical KPI codes from text and replace with human-readable descriptions
   * @param text Text containing KPI codes
   * @returns Text with KPI codes replaced by human-readable descriptions
   */
  static stripTechnicalCodes(text: string): string {
    // Regex pattern to match KPI codes: CO####, CP####, CH####, CL####
    const kpiCodePattern = /\b(CO|CP|CH|CL)\d{4}\b/g;
    
    return text.replace(kpiCodePattern, (match) => {
      const humanReadable = this.translateKPICodeToHuman(match);
      // Replace code with human-readable name in parentheses for clarity
      return `${humanReadable} (${match})`;
    });
  }

  /**
   * Format raw AI response into structured chat response
   * Parses response, extracts findings, and builds traceability
   * @param rawResponse Raw AI response text
   * @param kpiData Array of KPI data with details
   * @returns Structured chat response object
   */
  static formatStructuredResponse(
    rawResponse: string,
    kpiData: KPIDataWithDetails[]
  ): StructuredChatResponse {
    // Extract KPI references for traceability
    const kpiTraceability = this.extractKPIReferences(rawResponse, kpiData);

    // Extract summary (first 2-3 sentences, max 150 chars)
    const summary = this.extractSummary(rawResponse);

    // Extract key findings
    const keyFindings = this.extractKeyFindings(rawResponse, kpiData);

    // Extract risk indicators
    const riskIndicators = this.extractRiskIndicators(rawResponse, kpiData);

    // Extract recommended actions
    const recommendedActions = this.extractRecommendedActions(rawResponse);

    // Extract detailed analysis (optional)
    const detailedAnalysis = this.extractDetailedAnalysis(rawResponse);

    return {
      summary,
      keyFindings: keyFindings.slice(0, 5), // Limit to 5 findings
      riskIndicators,
      recommendedActions: recommendedActions.slice(0, 3), // Limit to 3 actions
      kpiTraceability,
      detailedAnalysis,
    };
  }

  /**
   * Extract summary from raw response (first 2-3 sentences, max 150 chars)
   * @param rawResponse Raw AI response text
   * @returns Summary text
   */
  private static extractSummary(rawResponse: string): string {
    // Split into sentences
    const sentences = rawResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Take first 2-3 sentences
    let summary = sentences.slice(0, 3).join('. ').trim();
    
    // Add period if missing
    if (summary && !summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
      summary += '.';
    }
    
    // Truncate to 150 chars if needed
    if (summary.length > 150) {
      summary = summary.substring(0, 147) + '...';
    }
    
    return this.stripTechnicalCodes(summary);
  }

  /**
   * Extract key findings from raw response
   * Looks for patterns indicating findings and extracts them
   * @param rawResponse Raw AI response text
   * @param kpiData Array of KPI data with details
   * @returns Array of key findings
   */
  private static extractKeyFindings(
    rawResponse: string,
    kpiData: KPIDataWithDetails[]
  ): KeyFinding[] {
    const findings: KeyFinding[] = [];
    
    // Look for bullet points, numbered lists, or "finding" patterns
    const findingPatterns = [
      /[-•*]\s*(.+?)(?=\n|$)/g, // Bullet points
      /\d+[.)]\s*(.+?)(?=\n|$)/g, // Numbered lists
      /(?:finding|insight|observation):\s*(.+?)(?=\n|\.|$)/gi, // Explicit finding markers
    ];

    const foundTexts = new Set<string>();

    for (const pattern of findingPatterns) {
      let match;
      while ((match = pattern.exec(rawResponse)) !== null) {
        const text = match[1].trim();
        if (text.length > 10 && !foundTexts.has(text)) {
          foundTexts.add(text);
          
          // Extract KPI codes from the finding
          const kpiCodePattern = /\b(CO|CP|CH|CL)\d{4}\b/g;
          const supportingKPIs: string[] = [];
          let kpiMatch;
          while ((kpiMatch = kpiCodePattern.exec(text)) !== null) {
            supportingKPIs.push(kpiMatch[0]);
          }

          // Determine severity based on keywords
          const severity = this.determineSeverity(text);

          findings.push({
            finding: this.stripTechnicalCodes(text),
            supportingKPIs: [...new Set(supportingKPIs)], // Remove duplicates
            severity,
          });
        }
      }
    }

    // If no structured findings found, create from paragraphs
    if (findings.length === 0) {
      const paragraphs = rawResponse.split(/\n\n+/).filter(p => p.trim().length > 20);
      for (const para of paragraphs.slice(0, 5)) {
        const kpiCodePattern = /\b(CO|CP|CH|CL)\d{4}\b/g;
        const supportingKPIs: string[] = [];
        let kpiMatch;
        while ((kpiMatch = kpiCodePattern.exec(para)) !== null) {
          supportingKPIs.push(kpiMatch[0]);
        }

        if (supportingKPIs.length > 0 || para.length > 30) {
          findings.push({
            finding: this.stripTechnicalCodes(para.substring(0, 200)),
            supportingKPIs: [...new Set(supportingKPIs)],
            severity: this.determineSeverity(para),
          });
        }
      }
    }

    return findings;
  }

  /**
   * Determine severity from text content
   * @param text Text to analyze
   * @returns Severity level
   */
  private static determineSeverity(text: string): 'positive' | 'neutral' | 'concern' | 'critical' {
    const lowerText = text.toLowerCase();
    
    // Critical indicators
    if (/\b(critical|urgent|severe|immediate|emergency|fail|failure|detention|incident)\b/.test(lowerText)) {
      return 'critical';
    }
    
    // Concern indicators
    if (/\b(concern|warning|low|poor|below|decline|risk|issue|problem)\b/.test(lowerText)) {
      return 'concern';
    }
    
    // Positive indicators
    if (/\b(excellent|outstanding|strong|high|good|above|improve|success)\b/.test(lowerText)) {
      return 'positive';
    }
    
    return 'neutral';
  }

  /**
   * Extract risk indicators from raw response
   * @param rawResponse Raw AI response text
   * @param kpiData Array of KPI data with details
   * @returns Array of risk indicators
   */
  private static extractRiskIndicators(
    rawResponse: string,
    kpiData: KPIDataWithDetails[]
  ): RiskIndicatorSummary[] {
    const risks: RiskIndicatorSummary[] = [];
    
    // Look for risk-related patterns
    const riskPatterns = [
      /(?:risk|concern|issue):\s*(.+?)(?=\n|\.|$)/gi,
      /(?:high|medium|low|critical)\s+risk[:\s]+(.+?)(?=\n|\.|$)/gi,
    ];

    for (const pattern of riskPatterns) {
      let match;
      while ((match = pattern.exec(rawResponse)) !== null) {
        const text = match[1].trim();
        
        // Extract KPI codes
        const kpiCodePattern = /\b(CO|CP|CH|CL)\d{4}\b/g;
        const affectedKPIs: string[] = [];
        let kpiMatch;
        while ((kpiMatch = kpiCodePattern.exec(text)) !== null) {
          affectedKPIs.push(kpiMatch[0]);
        }

        // Determine severity
        const severity = this.determineRiskSeverity(text);

        // Determine risk type
        const riskType = this.determineRiskType(text);

        risks.push({
          riskType,
          severity,
          description: this.stripTechnicalCodes(text),
          affectedKPIs: [...new Set(affectedKPIs)],
        });
      }
    }

    return risks;
  }

  /**
   * Determine risk severity from text
   * @param text Text to analyze
   * @returns Risk severity level
   */
  private static determineRiskSeverity(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const lowerText = text.toLowerCase();
    
    if (/\b(critical|severe|emergency|immediate)\b/.test(lowerText)) {
      return 'CRITICAL';
    }
    if (/\b(high|significant|major)\b/.test(lowerText)) {
      return 'HIGH';
    }
    if (/\b(medium|moderate|some)\b/.test(lowerText)) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Determine risk type from text
   * @param text Text to analyze
   * @returns Risk type
   */
  private static determineRiskType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (/\b(performance|capability|competency|skill)\b/.test(lowerText)) {
      return 'Performance Risk';
    }
    if (/\b(compliance|inspection|detention|violation)\b/.test(lowerText)) {
      return 'Compliance Risk';
    }
    if (/\b(medical|health|fatigue)\b/.test(lowerText)) {
      return 'Health Risk';
    }
    if (/\b(behavioral|conduct|disciplinary)\b/.test(lowerText)) {
      return 'Behavioral Risk';
    }
    if (/\b(contract|retention|turnover)\b/.test(lowerText)) {
      return 'Retention Risk';
    }
    
    return 'General Risk';
  }

  /**
   * Extract recommended actions from raw response
   * @param rawResponse Raw AI response text
   * @returns Array of recommended actions
   */
  private static extractRecommendedActions(rawResponse: string): string[] {
    const actions: string[] = [];
    
    // Look for action patterns
    const actionPatterns = [
      /(?:recommend|suggest|action|should|must):\s*(.+?)(?=\n|\.|$)/gi,
      /(?:next steps?|follow-up):\s*(.+?)(?=\n|\.|$)/gi,
    ];

    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(rawResponse)) !== null) {
        const text = match[1].trim();
        if (text.length > 10) {
          actions.push(this.stripTechnicalCodes(text));
        }
      }
    }

    // If no explicit actions found, look for imperative sentences
    if (actions.length === 0) {
      const sentences = rawResponse.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 15 && /^(consider|review|ensure|implement|provide|conduct)/i.test(trimmed)) {
          actions.push(this.stripTechnicalCodes(trimmed));
        }
      }
    }

    return actions;
  }

  /**
   * Extract detailed analysis from raw response
   * @param rawResponse Raw AI response text
   * @returns Detailed analysis text or undefined
   */
  private static extractDetailedAnalysis(rawResponse: string): string | undefined {
    // If response is long enough, use the full text as detailed analysis
    if (rawResponse.length > 500) {
      return this.stripTechnicalCodes(rawResponse);
    }
    
    return undefined;
  }

  /**
   * Generate user-friendly text from structured response
   * Converts structured data back to readable narrative
   */
  static generateUserFriendlyText(structured: StructuredChatResponse): string {
    const parts: string[] = [];
    
    // Summary
    parts.push(structured.summary);
    parts.push(''); // blank line
    
    // Key findings
    if (structured.keyFindings.length > 0) {
      parts.push('**Key Findings:**');
      structured.keyFindings.forEach((finding, idx) => {
        const icon = finding.severity === 'positive' ? '✅' : 
                     finding.severity === 'concern' ? '⚠️' : 
                     finding.severity === 'critical' ? '🚨' : '•';
        parts.push(`${icon} ${finding.finding}`);
      });
      parts.push(''); // blank line
    }
    
    // Risk indicators
    if (structured.riskIndicators && structured.riskIndicators.length > 0) {
      parts.push('**Risk Indicators:**');
      structured.riskIndicators.forEach(risk => {
        const icon = risk.severity === 'CRITICAL' ? '🚨' : 
                     risk.severity === 'HIGH' ? '⚠️' : 
                     risk.severity === 'MEDIUM' ? '⚡' : 'ℹ️';
        parts.push(`${icon} **${risk.riskType}** (${risk.severity}): ${risk.description}`);
      });
      parts.push(''); // blank line
    }
    
    // Recommended actions
    if (structured.recommendedActions.length > 0) {
      parts.push('**Recommended Actions:**');
      structured.recommendedActions.forEach((action, idx) => {
        parts.push(`${idx + 1}. ${action}`);
      });
    }
    
    return parts.join('\n');
  }
}
