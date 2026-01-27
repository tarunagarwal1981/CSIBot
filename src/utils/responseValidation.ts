/**
 * Response Validation Utility
 * Validates structured chat responses against business rules
 * @module utils/responseValidation
 */

import type { StructuredChatResponse } from '../types/chatResponse';
import { getKPIColumnMapping } from '../config/kpiColumnMapping';

/**
 * KPI code pattern: CO####, CP####, CH####, CL####
 */
const KPI_CODE_PATTERN = /C[OPH]L?\d{4}/g;

/**
 * Count words in a text string
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check if text contains KPI codes
 */
function containsKPICodes(text: string): boolean {
  return KPI_CODE_PATTERN.test(text);
}

/**
 * Validate structured chat response
 * Checks all business rules and returns validation result
 * @param response Structured chat response to validate
 * @returns Validation result with valid flag and error messages
 */
export function validateStructuredResponse(
  response: StructuredChatResponse
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Check summary length <= 150 chars
  if (response.summary.length > 150) {
    errors.push(`Summary exceeds 150 characters (${response.summary.length} chars)`);
  }

  // 2. Ensure keyFindings.length <= 5
  if (response.keyFindings.length > 5) {
    errors.push(`Too many key findings (${response.keyFindings.length}, max 5)`);
  }

  // 3. Ensure recommendedActions.length <= 3
  if (response.recommendedActions.length > 3) {
    errors.push(`Too many recommended actions (${response.recommendedActions.length}, max 3)`);
  }

  // 4. Validate no KPI codes in summary, findings, or recommendations
  if (containsKPICodes(response.summary)) {
    errors.push('Summary contains KPI codes - should use human-readable descriptions only');
  }

  // Check each finding
  response.keyFindings.forEach((finding, index) => {
    if (containsKPICodes(finding.finding)) {
      errors.push(`Key finding #${index + 1} contains KPI codes - should use human-readable descriptions only`);
    }
  });

  // Check each recommended action
  response.recommendedActions.forEach((action, index) => {
    if (containsKPICodes(action)) {
      errors.push(`Recommended action #${index + 1} contains KPI codes - should use human-readable descriptions only`);
    }
  });

  // Check risk indicator descriptions
  response.riskIndicators.forEach((risk, index) => {
    if (containsKPICodes(risk.description)) {
      errors.push(`Risk indicator #${index + 1} description contains KPI codes - should use human-readable descriptions only`);
    }
  });

  // 5. If detailedAnalysis exists, check word count <= 500
  if (response.detailedAnalysis) {
    const wordCount = countWords(response.detailedAnalysis);
    if (wordCount > 500) {
      errors.push(`Detailed analysis exceeds 500 words (${wordCount} words)`);
    }
  }

  // 6. Validate key findings structure
  response.keyFindings.forEach((finding, index) => {
    if (!finding.finding || finding.finding.trim().length === 0) {
      errors.push(`Key finding #${index + 1} has empty finding text`);
    }
    if (!Array.isArray(finding.supportingKPIs)) {
      errors.push(`Key finding #${index + 1} has invalid supportingKPIs (must be array)`);
    }
    if (!['positive', 'neutral', 'concern', 'critical'].includes(finding.severity)) {
      errors.push(`Key finding #${index + 1} has invalid severity: ${finding.severity}`);
    }
  });

  // 7. Check that supportingKPIs references are valid
  response.keyFindings.forEach((finding, index) => {
    if (finding.supportingKPIs && Array.isArray(finding.supportingKPIs)) {
      finding.supportingKPIs.forEach(kpiRef => {
        // Extract just the KPI code if it's in format "Description (CODE)"
        const codeMatch = kpiRef.match(/\(?(C[OPH]L?\d{4})\)?/);
        const kpiCode = codeMatch ? codeMatch[1] : kpiRef;
        
        const mapping = getKPIColumnMapping(kpiCode);
        if (!mapping) {
          console.warn(`⚠️ Key finding #${index + 1} references unknown KPI: ${kpiCode}`);
          // Don't add to errors - just warn, as LLM might use full descriptions
        }
      });
    }
  });

  // 8. Validate risk indicators structure
  response.riskIndicators.forEach((risk, index) => {
    if (!risk.riskType || risk.riskType.trim().length === 0) {
      errors.push(`Risk indicator #${index + 1} has empty riskType`);
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(risk.severity)) {
      errors.push(`Risk indicator #${index + 1} has invalid severity: ${risk.severity}`);
    }
    if (!risk.description || risk.description.trim().length === 0) {
      errors.push(`Risk indicator #${index + 1} has empty description`);
    }
    if (!Array.isArray(risk.affectedKPIs)) {
      errors.push(`Risk indicator #${index + 1} has invalid affectedKPIs (must be array)`);
    }
  });

  // 9. Validate KPI traceability entries (if present)
  if (response.kpiTraceability && Array.isArray(response.kpiTraceability)) {
    response.kpiTraceability.forEach((kpi, index) => {
      const mapping = getKPIColumnMapping(kpi.kpiCode);
      if (!mapping) {
        errors.push(`KPI traceability #${index + 1} has invalid kpiCode: ${kpi.kpiCode}`);
      }
      if (!kpi.humanReadableName || kpi.humanReadableName.trim().length === 0) {
        errors.push(`KPI traceability #${index + 1} has empty humanReadableName`);
      }
      if (!kpi.category || kpi.category.trim().length === 0) {
        errors.push(`KPI traceability #${index + 1} has empty category`);
      }
      if (!kpi.interpretation || kpi.interpretation.trim().length === 0) {
        errors.push(`KPI traceability #${index + 1} has empty interpretation`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
