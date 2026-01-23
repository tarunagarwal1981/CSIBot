/**
 * Calculate KPIs Function Handler
 * On-demand KPI calculation for derived metrics
 * @module functions/calculate-kpis/handler
 */

import type { Handler } from 'aws-lambda';
import { KPIRepository } from '../../../src/services/database/repositories/kpiRepository';
import { PerformanceRepository } from '../../../src/services/database/repositories/performanceRepository';
import { TrainingRepository } from '../../../src/services/database/repositories/trainingRepository';
import { ExperienceRepository } from '../../../src/services/database/repositories/experienceRepository';
import { DatabaseConnection } from '../../../src/services/database/connection';

interface CalculateKPIRequest {
  seafarerId: number;
  kpiCodes?: string[]; // If empty, calculate all derived KPIs
  saveToDB?: boolean; // If true, save calculated values to kpi_values table
}

/**
 * Lambda handler for KPI calculation
 */
export const handler: Handler = async (event: any) => {
  try {
    const body: CalculateKPIRequest = event.body
      ? JSON.parse(event.body)
      : event;

    const { seafarerId, kpiCodes, saveToDB = false } = body;

    if (!seafarerId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'seafarerId is required' }),
      };
    }

    // Get all active KPI definitions if no specific codes provided
    let kpisToCalculate: string[] = kpiCodes || [];

    if (kpisToCalculate.length === 0) {
      // Get all active KPIs and calculate derived ones
      const allKPIs = await KPIRepository.getAllKPIDefinitions();
      kpisToCalculate = allKPIs.map((kpi) => kpi.kpi_code);
    }

    const results: Record<
      string,
      {
        value: any;
        calculated_at: string;
        unit: string | null;
        error?: string;
      }
    > = {};

    // Calculate each KPI
    for (const kpiCode of kpisToCalculate) {
      try {
        // Get KPI definition
        const kpiDef = await KPIRepository.getKPIByCode(kpiCode);
        if (!kpiDef) {
          results[kpiCode] = {
            value: null,
            calculated_at: new Date().toISOString(),
            unit: null,
            error: `KPI definition not found: ${kpiCode}`,
          };
          continue;
        }

        let value: any = null;

        // Route to appropriate calculation based on KPI code or type
        // This is a simplified routing - extend based on your actual KPI codes
        if (kpiCode.startsWith('CP')) {
          // Performance KPIs
          switch (kpiCode) {
            case 'CP0005': // Voyage success rate
              value = await PerformanceRepository.getVoyageSuccessRate(seafarerId);
              break;

            case 'CP0006': // Days since last failure
              value = await PerformanceRepository.getDaysSinceLastFailure(seafarerId);
              break;

            case 'CP0007': // Major incidents count
              value = await PerformanceRepository.getMajorIncidentsCount(seafarerId);
              break;

            case 'CP0008': // Detention count
              value = await PerformanceRepository.getDetentionCount(seafarerId);
              break;

            case 'CP0009': // Unresolved events count
              value = await PerformanceRepository.getUnresolvedEventsCount(seafarerId);
              break;

            default:
              // Try generic calculation
              value = await KPIRepository.calculateDerivedKPI(seafarerId, kpiCode);
          }
        } else if (kpiCode.startsWith('CO')) {
          // Competency KPIs
          switch (kpiCode) {
            case 'CO0004': // CBT score
              value = await TrainingRepository.getCBTScore(seafarerId);
              break;

            case 'CO0005': // Training matrix count
              value = await TrainingRepository.getTrainingMatrixCount(seafarerId);
              break;

            case 'CO0007': // Current rank experience
              value = await ExperienceRepository.getCurrentRankExperience(seafarerId);
              break;

            case 'CO0008': // Total sea time
              value = await ExperienceRepository.getTotalSeaTime(seafarerId);
              break;

            default:
              // Try generic calculation
              value = await KPIRepository.calculateDerivedKPI(seafarerId, kpiCode);
          }
        } else if (kpiCode.startsWith('CL')) {
          // Leadership KPIs
          switch (kpiCode) {
            case 'CL0005': // Positive inspections
              const positiveInspections = await PerformanceRepository.getInspections(
                seafarerId,
                true
              );
              value = positiveInspections.length;
              break;

            case 'CL0007': // Negative inspections
              const negativeInspections = await PerformanceRepository.getInspections(
                seafarerId,
                false
              );
              value = negativeInspections.length;
              break;

            default:
              // Try generic calculation
              value = await KPIRepository.calculateDerivedKPI(seafarerId, kpiCode);
          }
        } else {
          // Try generic calculation for other KPIs
          value = await KPIRepository.calculateDerivedKPI(seafarerId, kpiCode);
        }

        results[kpiCode] = {
          value,
          calculated_at: new Date().toISOString(),
          unit: kpiDef.units,
        };

        // Optionally save to database
        if (saveToDB && value !== null && typeof value === 'number') {
          await saveKPIValue(seafarerId, kpiCode, value);
        }
      } catch (error: any) {
        console.error(`Error calculating KPI ${kpiCode}:`, error);
        results[kpiCode] = {
          value: null,
          calculated_at: new Date().toISOString(),
          unit: null,
          error: error.message || 'Unknown error',
        };
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        seafarerId,
        kpis: results,
        timestamp: new Date().toISOString(),
        savedToDB: saveToDB,
      }),
    };
  } catch (error: any) {
    console.error('KPI calculation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    };
  } finally {
    // Close DB connections
    try {
      await DatabaseConnection.closePool();
    } catch (closeError) {
      console.error('Error closing database pool:', closeError);
    }
  }
};

/**
 * Save calculated KPI value to database
 * Invalidates previous values and inserts new one
 * @param seafarerId Seafarer ID
 * @param kpiCode KPI code
 * @param value Calculated value
 */
async function saveKPIValue(
  seafarerId: number,
  kpiCode: string,
  value: number
): Promise<void> {
  // First, invalidate any existing current values
  const invalidateSql = `
    UPDATE kpi_value
    SET valid_to = CURRENT_DATE - INTERVAL '1 day'
    WHERE seafarer_id = $1
      AND kpi_code = $2
      AND valid_to IS NULL
  `;

  await DatabaseConnection.query(invalidateSql, [seafarerId, kpiCode]);

  // Then insert new value
  const insertSql = `
    INSERT INTO kpi_value (
      seafarer_id,
      kpi_code,
      value,
      value_json,
      calculated_at,
      valid_from,
      valid_to
    )
    VALUES ($1, $2, $3, NULL, CURRENT_TIMESTAMP, CURRENT_DATE, NULL)
  `;

  await DatabaseConnection.query(insertSql, [seafarerId, kpiCode, value]);
}

/**
 * CORS headers for API responses
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}
