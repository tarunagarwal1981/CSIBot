/**
 * Experience Repository
 * Database operations for crew experience history and related calculations
 * @module services/database/repositories/experienceRepository
 */

import { DatabaseConnection } from '../connection';
import type { ExperienceHistory } from '../../../types/database';

/**
 * Repository for experience-related database operations
 */
export class ExperienceRepository {
  /**
   * Get all experience history for a seafarer
   * Uses crew_code to query vw_csi_crew_vessel_master
   * Ordered by most recent first
   * @param crewCode Crew code
   * @returns Array of experience history records
   */
  static async getExperienceHistory(
    crewCode: string
  ): Promise<ExperienceHistory[]> {
    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY sign_on_date DESC)::integer as id,
        seafarer_id,
        vessel_name,
        imo_number::text as vessel_imo,
        vessel_type,
        rank_name as rank,
        sign_on_date,
        sign_off_date,
        COALESCE(
          EXTRACT(YEAR FROM age(COALESCE(sign_off_date, CURRENT_DATE), sign_on_date)) * 12 +
          EXTRACT(MONTH FROM age(COALESCE(sign_off_date, CURRENT_DATE), sign_on_date)),
          0
        )::integer as tenure_months,
        NULL::text as experience_type,
        NULL::jsonb as details
      FROM experience_history
      WHERE crew_code = $1
      ORDER BY sign_on_date DESC
    `;

    return await DatabaseConnection.query<ExperienceHistory>(sql, [crewCode]);
  }

  /**
   * Get current rank experience in months
   * Calculates total months spent in the current rank from crew_master
   * @param seafarerId Seafarer ID
   * @returns Total months of experience in current rank
   */
  static async getCurrentRankExperience(seafarerId: number): Promise<number> {
    const sql = `
      WITH current_rank AS (
        SELECT current_rank_name
        FROM crew_master
        WHERE seafarer_id = $1
      )
      SELECT 
        COALESCE(SUM(tenure_months), 0) as total_months
      FROM experience_history eh
      CROSS JOIN current_rank cr
      WHERE eh.seafarer_id = $1
        AND eh.rank = cr.current_rank_name
    `;

    const result = await DatabaseConnection.queryOne<{ total_months: number }>(
      sql,
      [seafarerId]
    );

    return result?.total_months ?? 0;
  }

  /**
   * Get ship type experience in months
   * Calculates total months of experience for a specific vessel type
   * @param seafarerId Seafarer ID
   * @param shipType Vessel type to filter by
   * @returns Total months of experience with the specified ship type
   */
  static async getShipTypeExperience(
    seafarerId: number,
    shipType: string
  ): Promise<number> {
    const sql = `
      SELECT 
        COALESCE(SUM(tenure_months), 0) as total_months
      FROM experience_history
      WHERE seafarer_id = $1
        AND LOWER(vessel_type) = LOWER($2)
    `;

    const result = await DatabaseConnection.queryOne<{ total_months: number }>(
      sql,
      [seafarerId, shipType]
    );

    return result?.total_months ?? 0;
  }

  /**
   * Get vessel takeover count
   * Counts experiences where vessel was taken over (new or second-hand)
   * Uses JSONB details field to check for takeover information
   * @param seafarerId Seafarer ID
   * @param takeoverType Type of takeover ('new' or 'second_hand')
   * @returns Count of vessel takeovers
   */
  static async getVesselTakeoverCount(
    seafarerId: number,
    takeoverType: 'new' | 'second_hand'
  ): Promise<number> {
    const sql = `
      SELECT COUNT(*) as takeover_count
      FROM experience_history
      WHERE seafarer_id = $1
        AND details IS NOT NULL
        AND (
          CASE 
            WHEN $2 = 'new' THEN
              details->>'takeover_type' = 'new'
              OR details->>'is_new_vessel' = 'true'
              OR details->>'vessel_status' = 'new'
            WHEN $2 = 'second_hand' THEN
              details->>'takeover_type' = 'second_hand'
              OR details->>'is_second_hand' = 'true'
              OR details->>'vessel_status' = 'second_hand'
          END
        )
    `;

    const result = await DatabaseConnection.queryOne<{ takeover_count: string }>(
      sql,
      [seafarerId, takeoverType]
    );

    return parseInt(result?.takeover_count || '0', 10);
  }

  /**
   * Get OTA (Oil Tanker Association) ship experience from last 5 years
   * Filters experience history for OTA vessels within the last 5 years
   * @param seafarerId Seafarer ID
   * @returns Array of OTA ship experience records
   */
  static async getOTAShipExperience(
    seafarerId: number
  ): Promise<ExperienceHistory[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        vessel_name,
        vessel_imo,
        vessel_type,
        rank,
        sign_on_date,
        sign_off_date,
        tenure_months,
        experience_type,
        details
      FROM experience_history
      WHERE seafarer_id = $1
        AND (
          LOWER(vessel_type) LIKE '%tanker%'
          OR LOWER(vessel_type) LIKE '%ota%'
          OR LOWER(vessel_type) LIKE '%oil%'
          OR (details IS NOT NULL AND (
            details->>'is_ota' = 'true'
            OR details->>'vessel_category' = 'OTA'
            OR LOWER(details->>'vessel_category') LIKE '%tanker%'
          ))
        )
        AND (
          sign_on_date >= CURRENT_DATE - INTERVAL '5 years'
          OR (sign_off_date IS NULL AND sign_on_date >= CURRENT_DATE - INTERVAL '5 years')
        )
      ORDER BY sign_on_date DESC
    `;

    return await DatabaseConnection.query<ExperienceHistory>(sql, [seafarerId]);
  }

  /**
   * Get dry dock experience count
   * Counts experiences where seafarer was involved in dry dock operations
   * Uses JSONB details field to check for dry dock information
   * @param seafarerId Seafarer ID
   * @returns Count of dry dock experiences
   */
  static async getDryDockExperience(seafarerId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as dry_dock_count
      FROM experience_history
      WHERE seafarer_id = $1
        AND details IS NOT NULL
        AND (
          details->>'had_dry_dock' = 'true'
          OR details->>'dry_dock_experience' = 'true'
          OR details->>'dry_dock_count' IS NOT NULL
          OR LOWER(details->>'special_operations') LIKE '%dry dock%'
          OR LOWER(details->>'special_operations') LIKE '%drydock%'
        )
    `;

    const result = await DatabaseConnection.queryOne<{ dry_dock_count: string }>(
      sql,
      [seafarerId]
    );

    return parseInt(result?.dry_dock_count || '0', 10);
  }

  /**
   * Get total sea time in months
   * Calculates total months at sea across all experiences
   * @param seafarerId Seafarer ID
   * @returns Total months at sea
   */
  static async getTotalSeaTime(seafarerId: number): Promise<number> {
    const sql = `
      SELECT 
        COALESCE(SUM(tenure_months), 0) as total_months
      FROM experience_history
      WHERE seafarer_id = $1
    `;

    const result = await DatabaseConnection.queryOne<{ total_months: number }>(
      sql,
      [seafarerId]
    );

    return result?.total_months ?? 0;
  }

  /**
   * Get experience summary by vessel type
   * Aggregates experience by vessel type with total months
   * @param seafarerId Seafarer ID
   * @returns Array of vessel types with their total months
   */
  static async getExperienceByVesselType(
    seafarerId: number
  ): Promise<Array<{ vessel_type: string; total_months: number; count: number }>> {
    const sql = `
      SELECT 
        vessel_type,
        SUM(tenure_months) as total_months,
        COUNT(*) as count
      FROM experience_history
      WHERE seafarer_id = $1
      GROUP BY vessel_type
      ORDER BY total_months DESC
    `;

    const results = await DatabaseConnection.query<{
      vessel_type: string;
      total_months: number;
      count: string;
    }>(sql, [seafarerId]);

    return results.map((row) => ({
      vessel_type: row.vessel_type,
      total_months: row.total_months,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Get experience summary by rank
   * Aggregates experience by rank with total months
   * @param seafarerId Seafarer ID
   * @returns Array of ranks with their total months
   */
  static async getExperienceByRank(
    seafarerId: number
  ): Promise<Array<{ rank: string; total_months: number; count: number }>> {
    const sql = `
      SELECT 
        rank,
        SUM(tenure_months) as total_months,
        COUNT(*) as count
      FROM experience_history
      WHERE seafarer_id = $1
      GROUP BY rank
      ORDER BY total_months DESC
    `;

    const results = await DatabaseConnection.query<{
      rank: string;
      total_months: number;
      count: string;
    }>(sql, [seafarerId]);

    return results.map((row) => ({
      rank: row.rank,
      total_months: row.total_months,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Get recent experience (last N months)
   * Uses crew_code to query vw_csi_crew_vessel_master
   * @param crewCode Crew code
   * @param months Number of months to look back (default: 12)
   * @returns Array of recent experience records
   */
  static async getRecentExperience(
    crewCode: string,
    months: number = 12
  ): Promise<ExperienceHistory[]> {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY sign_on_date DESC)::integer as id,
        seafarer_id,
        vessel_name,
        imo_number::text as vessel_imo,
        vessel_type,
        rank_name as rank,
        sign_on_date,
        sign_off_date,
        COALESCE(
          EXTRACT(YEAR FROM age(COALESCE(sign_off_date, CURRENT_DATE), sign_on_date)) * 12 +
          EXTRACT(MONTH FROM age(COALESCE(sign_off_date, CURRENT_DATE), sign_on_date)),
          0
        )::integer as tenure_months,
        NULL::text as experience_type,
        NULL::jsonb as details
      FROM experience_history
      WHERE crew_code = $1
        AND (
          sign_on_date >= $2
          OR (sign_off_date IS NULL AND sign_on_date >= $2)
        )
      ORDER BY sign_on_date DESC
    `;

    return await DatabaseConnection.query<ExperienceHistory>(sql, [
      crewCode,
      cutoffDate,
    ]);
  }

  /**
   * Get experience for a specific date range
   * @param seafarerId Seafarer ID
   * @param startDate Start date (inclusive)
   * @param endDate End date (inclusive)
   * @returns Array of experience records within the date range
   */
  static async getExperienceByDateRange(
    seafarerId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ExperienceHistory[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        vessel_name,
        vessel_imo,
        vessel_type,
        rank,
        sign_on_date,
        sign_off_date,
        tenure_months,
        experience_type,
        details
      FROM experience_history
      WHERE seafarer_id = $1
        AND (
          (sign_on_date <= $3 AND (sign_off_date IS NULL OR sign_off_date >= $2))
          OR (sign_on_date BETWEEN $2 AND $3)
        )
      ORDER BY sign_on_date DESC
    `;

    return await DatabaseConnection.query<ExperienceHistory>(sql, [
      seafarerId,
      startDate,
      endDate,
    ]);
  }

  /**
   * Get current assignment
   * Returns the current active assignment (where sign_off_date is NULL)
   * @param seafarerId Seafarer ID
   * @returns Current experience record or null
   */
  static async getCurrentAssignment(
    seafarerId: number
  ): Promise<ExperienceHistory | null> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        vessel_name,
        vessel_imo,
        vessel_type,
        rank,
        sign_on_date,
        sign_off_date,
        tenure_months,
        experience_type,
        details
      FROM experience_history
      WHERE seafarer_id = $1
        AND sign_off_date IS NULL
      ORDER BY sign_on_date DESC
      LIMIT 1
    `;

    return await DatabaseConnection.queryOne<ExperienceHistory>(sql, [seafarerId]);
  }

  /**
   * Get experience with special operations
   * Filters experiences that have special operations mentioned in JSONB details
   * @param seafarerId Seafarer ID
   * @param operationType Type of operation to search for (e.g., 'dry_dock', 'tanker', 'lng')
   * @returns Array of experience records with the specified operation
   */
  static async getExperienceWithSpecialOperations(
    seafarerId: number,
    operationType: string
  ): Promise<ExperienceHistory[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        vessel_name,
        vessel_imo,
        vessel_type,
        rank,
        sign_on_date,
        sign_off_date,
        tenure_months,
        experience_type,
        details
      FROM experience_history
      WHERE seafarer_id = $1
        AND details IS NOT NULL
        AND (
          LOWER(details->>'special_operations') LIKE LOWER($2)
          OR LOWER(details->>'operation_type') LIKE LOWER($2)
          OR LOWER(details::text) LIKE LOWER($2)
        )
      ORDER BY sign_on_date DESC
    `;

    return await DatabaseConnection.query<ExperienceHistory>(sql, [
      seafarerId,
      `%${operationType}%`,
    ]);
  }
}
