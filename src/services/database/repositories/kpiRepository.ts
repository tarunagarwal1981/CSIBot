/**
 * KPI Repository
 * Database operations for KPI definitions, values, trends, and benchmarks
 * @module services/database/repositories/kpiRepository
 */

import { DatabaseConnection } from '../connection';
import type {
  KPIDefinition,
  KPIValue,
  KPISnapshot,
} from '../../../types/database';
import {
  ALL_KPI_COLUMNS,
  getKPIColumnMapping,
  COMPETENCY_COLUMNS,
  CAPABILITY_COLUMNS,
  CHARACTER_COLUMNS,
  COLLABORATION_COLUMNS,
} from '../../../config/kpiColumnMapping';

/**
 * Repository for KPI-related database operations
 */
export class KPIRepository {
  /**
   * Get all active KPI definitions
   * @returns Array of all KPI definitions
   */
  static async getAllKPIDefinitions(): Promise<KPIDefinition[]> {
    const sql = `
      SELECT 
        code as kpi_code,
        title,
        description,
        units,
        parent_code,
        kpi_orientation,
        status,
        updated_at AS created_at,
        updated_at
      FROM csi_kpi_items
      WHERE status = 'Active'
      ORDER BY code
    `;

    return await DatabaseConnection.query<KPIDefinition>(sql);
  }

  /**
   * Get KPI definition by code
   * @param kpiCode KPI code (e.g., "CO0004")
   * @returns KPI definition or null if not found
   */
  static async getKPIByCode(kpiCode: string): Promise<KPIDefinition | null> {
    const sql = `
      SELECT 
        code as kpi_code,
        title,
        description,
        units,
        parent_code,
        kpi_orientation,
        status,
        updated_at AS created_at,
        updated_at
      FROM csi_kpi_items
      WHERE code = $1
    `;

    return await DatabaseConnection.queryOne<KPIDefinition>(sql, [kpiCode]);
  }

  /**
   * Get complete KPI snapshot for a seafarer
   * Builds snapshot from all 4 views using the column mapping
   */
  static async getCrewKPISnapshot(seafarerId: number): Promise<KPISnapshot> {
    try {
      console.log(`📊 Building KPI snapshot for seafarer ${seafarerId}`);

      // Build dynamic query using the column mapping
      const competencyColumns = Object.values(COMPETENCY_COLUMNS)
        .map(m => `('${m.kpiCode}', ${m.valueColumn})`)
        .join(',\n          ');

      const capabilityColumns = Object.values(CAPABILITY_COLUMNS)
        .map(m => `('${m.kpiCode}', ${m.valueColumn})`)
        .join(',\n          ');

      const characterColumns = Object.values(CHARACTER_COLUMNS)
        .map(m => `('${m.kpiCode}', ${m.valueColumn})`)
        .join(',\n          ');

      const collaborationColumns = Object.values(COLLABORATION_COLUMNS)
        .map(m => `('${m.kpiCode}', ${m.valueColumn})`)
        .join(',\n          ');

      const sql = `
      WITH competency_kpis AS (
        SELECT kpi_code, value
        FROM vw_csi_competency,
        LATERAL (VALUES
          ${competencyColumns}
        ) AS v(kpi_code, value)
        WHERE seafarer_id = $1
      ),
      capability_kpis AS (
        SELECT kpi_code, value
        FROM vw_csi_capability,
        LATERAL (VALUES
          ${capabilityColumns}
        ) AS v(kpi_code, value)
        WHERE seafarer_id = $1
      ),
      character_kpis AS (
        SELECT kpi_code, value
        FROM vw_csi_character,
        LATERAL (VALUES
          ${characterColumns}
        ) AS v(kpi_code, value)
        WHERE seafarer_id = $1
      ),
      collaboration_kpis AS (
        SELECT kpi_code, value
        FROM vw_csi_collaboration,
        LATERAL (VALUES
          ${collaborationColumns}
        ) AS v(kpi_code, value)
        WHERE seafarer_id = $1
      ),
      all_kpis AS (
        SELECT * FROM competency_kpis
        UNION ALL
        SELECT * FROM capability_kpis
        UNION ALL
        SELECT * FROM character_kpis
        UNION ALL
        SELECT * FROM collaboration_kpis
      )
      SELECT 
        json_object_agg(kpi_code, value) as kpi_data
      FROM all_kpis
    `;

      const result = await DatabaseConnection.queryOne<{ kpi_data: Record<string, number> }>(
        sql,
        [seafarerId]
      );

      if (!result || !result.kpi_data) {
        console.warn(`⚠️  No KPI data found for seafarer ${seafarerId}`);
        return { seafarer_id: seafarerId };
      }

      console.log(`✅ KPI snapshot built: ${Object.keys(result.kpi_data).length} KPIs`);
      
      return {
        seafarer_id: seafarerId,
        ...result.kpi_data,
      } as KPISnapshot;

    } catch (error: any) {
      console.error(`❌ Error building KPI snapshot for ${seafarerId}:`, error);
      throw error;
    }
  }

  /**
   * Get historical KPI values within a date range
   * @param seafarerId Seafarer ID
   * @param kpiCode KPI code
   * @param startDate Start date (inclusive)
   * @param endDate End date (inclusive)
   * @returns Array of KPI values
   */
  static async getKPIHistory(
    seafarerId: number,
    kpiCode: string,
    startDate: Date,
    endDate: Date
  ): Promise<KPIValue[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        kpi_code,
        value,
        value_json,
        calculated_at,
        valid_from,
        valid_to
      FROM kpi_value
      WHERE seafarer_id = $1
        AND kpi_code = $2
        AND valid_from <= $4
        AND (valid_to IS NULL OR valid_to >= $3)
      ORDER BY calculated_at ASC, valid_from ASC
    `;

    return await DatabaseConnection.query<KPIValue>(sql, [
      seafarerId,
      kpiCode,
      startDate,
      endDate,
    ]);
  }

  /**
   * Get KPI trend analysis (6-month comparison)
   * Compares current value with value from 6 months ago
   * @param seafarerId Seafarer ID
   * @param kpiCode KPI code
   * @returns Trend analysis with current, previous, change, and trend direction
   */
  static async getKPITrend(
    seafarerId: number,
    kpiCode: string
  ): Promise<{
    current: number;
    previous: number;
    change: number;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const sql = `
      WITH current_value AS (
        SELECT DISTINCT ON (kpi_code)
          value,
          calculated_at
        FROM kpi_value
        WHERE seafarer_id = $1
          AND kpi_code = $2
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        ORDER BY kpi_code, calculated_at DESC
        LIMIT 1
      ),
      previous_value AS (
        SELECT DISTINCT ON (kpi_code)
          value,
          calculated_at
        FROM kpi_value
        WHERE seafarer_id = $1
          AND kpi_code = $2
          AND calculated_at <= CURRENT_DATE - INTERVAL '6 months'
        ORDER BY kpi_code, calculated_at DESC
        LIMIT 1
      ),
      kpi_orientation AS (
        SELECT kpi_orientation
        FROM csi_kpi_items
        WHERE code = $2
      )
      SELECT 
        COALESCE(cv.value, 0) as current,
        COALESCE(pv.value, 0) as previous,
        COALESCE(cv.value, 0) - COALESCE(pv.value, 0) as change,
        CASE 
          WHEN ko.kpi_orientation = 'p' THEN
            CASE 
              WHEN COALESCE(cv.value, 0) > COALESCE(pv.value, 0) THEN 'improving'
              WHEN COALESCE(cv.value, 0) = COALESCE(pv.value, 0) THEN 'stable'
              ELSE 'declining'
            END
          ELSE
            CASE 
              WHEN COALESCE(cv.value, 0) < COALESCE(pv.value, 0) THEN 'improving'
              WHEN COALESCE(cv.value, 0) = COALESCE(pv.value, 0) THEN 'stable'
              ELSE 'declining'
            END
        END as trend
      FROM current_value cv
      CROSS JOIN kpi_orientation ko
      LEFT JOIN previous_value pv ON true
    `;

    const result = await DatabaseConnection.queryOne<{
      current: number;
      previous: number;
      change: number;
      trend: 'improving' | 'stable' | 'declining';
    }>(sql, [seafarerId, kpiCode]);

    if (!result) {
      // Return default values if no data found
      return {
        current: 0,
        previous: 0,
        change: 0,
        trend: 'stable',
      };
    }

    return result;
  }

  /**
   * Batch fetch multiple KPIs for multiple crew members
   * Optimized for fetching KPIs for multiple seafarers at once
   * @param seafarerIds Array of seafarer IDs
   * @param kpiCodes Array of KPI codes to fetch
   * @returns Map of seafarer ID to their KPI snapshot
   */
  static async getBatchKPIs(
    seafarerIds: number[],
    kpiCodes: string[]
  ): Promise<Map<number, KPISnapshot>> {
    if (seafarerIds.length === 0 || kpiCodes.length === 0) {
      return new Map();
    }

    const sql = `
      WITH latest_kpi_values AS (
        SELECT DISTINCT ON (seafarer_id, kpi_code)
          seafarer_id,
          kpi_code,
          value,
          calculated_at
        FROM kpi_value
        WHERE seafarer_id = ANY($1::int[])
          AND kpi_code = ANY($2::text[])
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        ORDER BY seafarer_id, kpi_code, calculated_at DESC
      )
      SELECT 
        seafarer_id,
        kpi_code,
        value
      FROM latest_kpi_values
      ORDER BY seafarer_id, kpi_code
    `;

    const results = await DatabaseConnection.query<{
      seafarer_id: number;
      kpi_code: string;
      value: number;
    }>(sql, [seafarerIds, kpiCodes]);

    // Group by seafarer_id
    const kpiMap = new Map<number, KPISnapshot>();

    for (const row of results) {
      if (!kpiMap.has(row.seafarer_id)) {
        kpiMap.set(row.seafarer_id, {});
      }
      const snapshot = kpiMap.get(row.seafarer_id)!;
      snapshot[row.kpi_code] = row.value;
    }

    // Fill in nulls for missing KPIs
    for (const seafarerId of seafarerIds) {
      if (!kpiMap.has(seafarerId)) {
        kpiMap.set(seafarerId, {});
      }
      const snapshot = kpiMap.get(seafarerId)!;
      for (const kpiCode of kpiCodes) {
        if (!(kpiCode in snapshot)) {
          snapshot[kpiCode] = null;
        }
      }
    }

    return kpiMap;
  }

  /**
   * Get benchmark values (fleet average, median, percentiles)
   * Can optionally filter by rank
   * @param kpiCode KPI code
   * @param rank Optional rank filter (e.g., "Chief Engineer")
   * @returns Benchmark statistics
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
    let sql = `
      WITH latest_kpi_values AS (
        SELECT DISTINCT ON (kv.seafarer_id)
          kv.value,
          cm.current_rank_name
        FROM kpi_value kv
        INNER JOIN crew_master cm ON kv.seafarer_id = cm.seafarer_id
        WHERE kv.kpi_code = $1
          AND (kv.valid_to IS NULL OR kv.valid_to >= CURRENT_DATE)
    `;

    const params: any[] = [kpiCode];

    if (rank) {
      sql += ` AND cm.current_rank_name = $2`;
      params.push(rank);
    }

    sql += `
        ORDER BY kv.seafarer_id, kv.calculated_at DESC
      )
      SELECT 
        COALESCE(AVG(value), 0) as average,
        COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value), 0) as median,
        COALESCE(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value), 0) as p75,
        COALESCE(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY value), 0) as p90
      FROM latest_kpi_values
      WHERE value IS NOT NULL
    `;

    const result = await DatabaseConnection.queryOne<{
      average: number;
      median: number;
      p75: number;
      p90: number;
    }>(sql, params);

    if (!result) {
      return {
        average: 0,
        median: 0,
        p75: 0,
        p90: 0,
      };
    }

    return result;
  }

  /**
   * Calculate derived KPIs that need computation
   * Some KPIs are calculated from other KPIs or require complex logic
   * @param seafarerId Seafarer ID
   * @param kpiCode KPI code to calculate
   * @returns Calculated KPI value
   */
  static async calculateDerivedKPI(
    seafarerId: number,
    kpiCode: string
  ): Promise<number> {
    // Get KPI definition to understand calculation requirements
    const kpiDef = await this.getKPIByCode(kpiCode);
    if (!kpiDef) {
      throw new Error(`KPI definition not found for code: ${kpiCode}`);
    }

    // Check if this is a parent KPI that needs aggregation
    if (kpiDef.parent_code === null) {
      // This is a root KPI, check if it has children that need aggregation
      const sql = `
        WITH child_kpis AS (
          SELECT code as kpi_code
          FROM csi_kpi_items
          WHERE parent_code = $1
        ),
        child_values AS (
          SELECT DISTINCT ON (kv.kpi_code)
            kv.value
          FROM kpi_value kv
          INNER JOIN child_kpis ck ON kv.kpi_code = ck.kpi_code
          WHERE kv.seafarer_id = $2
            AND (kv.valid_to IS NULL OR kv.valid_to >= CURRENT_DATE)
          ORDER BY kv.kpi_code, kv.calculated_at DESC
        )
        SELECT COALESCE(AVG(value), 0) as calculated_value
        FROM child_values
      `;

      const result = await DatabaseConnection.queryOne<{ calculated_value: number }>(
        sql,
        [kpiCode, seafarerId]
      );

      return result?.calculated_value ?? 0;
    }

    // For other derived KPIs, you might need specific calculation logic
    // This is a placeholder - extend based on your specific KPI calculation rules
    const sql = `
      SELECT DISTINCT ON (kpi_code)
        value
      FROM kpi_value
      WHERE seafarer_id = $1
        AND kpi_code = $2
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
      ORDER BY kpi_code, calculated_at DESC
      LIMIT 1
    `;

    const result = await DatabaseConnection.queryOne<{ value: number }>(sql, [
      seafarerId,
      kpiCode,
    ]);

    return result?.value ?? 0;
  }

  /**
   * Get KPI values for a specific date
   * Useful for historical analysis
   * @param seafarerId Seafarer ID
   * @param kpiCode KPI code
   * @param date Date to get value for
   * @returns KPI value or null if not found
   */
  static async getKPIValueAtDate(
    seafarerId: number,
    kpiCode: string,
    date: Date
  ): Promise<number | null> {
    const sql = `
      SELECT DISTINCT ON (kpi_code)
        value
      FROM kpi_value
      WHERE seafarer_id = $1
        AND kpi_code = $2
        AND valid_from <= $3
        AND (valid_to IS NULL OR valid_to >= $3)
      ORDER BY kpi_code, calculated_at DESC
      LIMIT 1
    `;

    const result = await DatabaseConnection.queryOne<{ value: number }>(sql, [
      seafarerId,
      kpiCode,
      date,
    ]);

    return result?.value ?? null;
  }

  /**
   * Get all KPIs for a seafarer with their definitions
   * Returns both the values and metadata
   * @param seafarerId Seafarer ID
   * @returns Array of KPI values with their definitions
   */
  static async getCrewKPIsWithDefinitions(
    seafarerId: number
  ): Promise<Array<KPIValue & { definition: KPIDefinition }>> {
    const sql = `
      WITH latest_kpi_values AS (
        SELECT DISTINCT ON (kpi_code)
          id,
          seafarer_id,
          kpi_code,
          value,
          value_json,
          calculated_at,
          valid_from,
          valid_to
        FROM kpi_value
        WHERE seafarer_id = $1
          AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
        ORDER BY kpi_code, calculated_at DESC
      )
      SELECT 
        kv.*,
        json_build_object(
          'kpi_code', kd.kpi_code,
          'title', kd.title,
          'description', kd.description,
          'units', kd.units,
          'parent_code', kd.parent_code,
          'kpi_orientation', kd.kpi_orientation,
          'status', kd.status,
          'created_at', kd.created_at,
          'updated_at', kd.updated_at
        ) as definition
      FROM latest_kpi_values kv
      INNER JOIN kpi_definition kd ON kv.kpi_code = kd.kpi_code
      WHERE kd.status = 'Active'
      ORDER BY kv.kpi_code
    `;

    const results = await DatabaseConnection.query<{
      id: number;
      seafarer_id: number;
      kpi_code: string;
      value: number;
      value_json: any;
      calculated_at: Date;
      valid_from: Date;
      valid_to: Date | null;
      definition: KPIDefinition;
    }>(sql, [seafarerId]);

    return results.map((row) => ({
      id: row.id,
      seafarer_id: row.seafarer_id,
      kpi_code: row.kpi_code,
      value: row.value,
      value_json: row.value_json,
      calculated_at: row.calculated_at,
      valid_from: row.valid_from,
      valid_to: row.valid_to,
      definition: row.definition,
    }));
  }
}
