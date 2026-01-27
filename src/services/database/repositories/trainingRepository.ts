/**
 * Training Repository
 * Database operations for training certifications and training-related data
 * @module services/database/repositories/trainingRepository
 */

import { DatabaseConnection } from '../connection';
import type { TrainingCertification } from '../../../types/database';

/**
 * Repository for training-related database operations
 */
export class TrainingRepository {
  /**
   * Get all certifications for a seafarer
   * Note: Training data is available in vw_csi_competency as KPIs:
   * - CO0010: training_matrix_course (training matrix course count)
   * - CO0011: superior_certificate (superior certificate status)
   * No separate training_certification table exists in CSI schema.
   * Training data is already included in the KPI snapshot.
   * 
   * @param seafarerId Seafarer ID
   * @returns Empty array - training data is in KPI snapshot
   */
  static async getCertifications(
    seafarerId: number
  ): Promise<TrainingCertification[]> {
    // Training data is available in vw_csi_competency as KPI CO0010 (training_matrix_course)
    // and CO0011 (superior_certificate). No separate training_certification table exists.
    // Return empty array - training data is already in KPI snapshot (kpiSnapshot['CO0010'], kpiSnapshot['CO0011'])
    return [];
  }

  /**
   * Get valid certifications only
   * Returns certifications with status 'valid' and not expired
   * @param seafarerId Seafarer ID
   * @returns Array of valid training certifications
   */
  static async getValidCertifications(
    seafarerId: number
  ): Promise<TrainingCertification[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        course_name,
        certification_type,
        issue_date,
        expiry_date,
        issuing_authority,
        status,
        details
      FROM training_certification
      WHERE seafarer_id = $1
        AND status = 'valid'
        AND (
          expiry_date IS NULL
          OR expiry_date >= CURRENT_DATE
        )
      ORDER BY expiry_date ASC NULLS LAST, issue_date DESC
    `;

    return await DatabaseConnection.query<TrainingCertification>(sql, [seafarerId]);
  }

  /**
   * Get expiring certifications (within N days)
   * Returns certifications that will expire within the specified number of days
   * Also updates status to 'expiring_soon' if needed
   * @param seafarerId Seafarer ID
   * @param withinDays Number of days to check ahead (default: 90)
   * @returns Array of expiring certifications
   */
  static async getExpiringCertifications(
    seafarerId: number,
    withinDays: number = 90
  ): Promise<TrainingCertification[]> {
    // First, update status for certifications that are expiring soon
    const updateSql = `
      UPDATE training_certification
      SET status = 'expiring_soon'
      WHERE seafarer_id = $1
        AND status = 'valid'
        AND expiry_date IS NOT NULL
        AND expiry_date >= CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
    `;

    await DatabaseConnection.query(updateSql, [seafarerId, withinDays]);

    // Then fetch the expiring certifications
    const selectSql = `
      SELECT 
        id,
        seafarer_id,
        course_name,
        certification_type,
        issue_date,
        expiry_date,
        issuing_authority,
        status,
        details
      FROM training_certification
      WHERE seafarer_id = $1
        AND expiry_date IS NOT NULL
        AND expiry_date >= CURRENT_DATE
        AND expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $2
      ORDER BY expiry_date ASC
    `;

    return await DatabaseConnection.query<TrainingCertification>(selectSql, [
      seafarerId,
      withinDays,
    ]);
  }

  /**
   * Get training matrix completion count
   * Counts the number of required certifications that the seafarer has completed
   * This assumes required certifications are defined in a separate table or JSONB field
   * @param seafarerId Seafarer ID
   * @returns Number of completed required certifications
   */
  static async getTrainingMatrixCount(seafarerId: number): Promise<number> {
    // This query counts certifications that are marked as required in the details field
    // or matches against a standard set of required certifications
    const sql = `
      WITH required_certs AS (
        SELECT DISTINCT course_name
        FROM training_certification
        WHERE details IS NOT NULL
          AND (details->>'is_required' = 'true' OR details->>'required' = 'true')
      ),
      seafarer_certs AS (
        SELECT DISTINCT course_name
        FROM training_certification
        WHERE seafarer_id = $1
          AND status = 'valid'
          AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      )
      SELECT COUNT(*) as completion_count
      FROM required_certs rc
      INNER JOIN seafarer_certs sc ON rc.course_name = sc.course_name
    `;

    const result = await DatabaseConnection.queryOne<{ completion_count: string }>(
      sql,
      [seafarerId]
    );

    return parseInt(result?.completion_count || '0', 10);
  }

  /**
   * Get CBT (Computer-Based Training) score
   * Retrieves CBT score from the details JSONB field
   * @param seafarerId Seafarer ID
   * @returns CBT score or null if not found
   */
  static async getCBTScore(seafarerId: number): Promise<number | null> {
    const sql = `
      SELECT 
        (details->>'cbt_score')::numeric as cbt_score,
        (details->>'score')::numeric as score
      FROM training_certification
      WHERE seafarer_id = $1
        AND (
          LOWER(course_name) LIKE '%cbt%'
          OR LOWER(certification_type) LIKE '%cbt%'
          OR details->>'cbt_score' IS NOT NULL
          OR details->>'score' IS NOT NULL
        )
        AND status = 'valid'
      ORDER BY issue_date DESC
      LIMIT 1
    `;

    const result = await DatabaseConnection.queryOne<{
      cbt_score: number | null;
      score: number | null;
    }>(sql, [seafarerId]);

    return result?.cbt_score ?? result?.score ?? null;
  }

  /**
   * Check if seafarer has a specific certification
   * @param seafarerId Seafarer ID
   * @param certificationName Name of the certification to check
   * @returns true if certification exists and is valid, false otherwise
   */
  static async hasCertification(
    seafarerId: number,
    certificationName: string
  ): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as cert_count
      FROM training_certification
      WHERE seafarer_id = $1
        AND (
          LOWER(course_name) = LOWER($2)
          OR LOWER(certification_type) = LOWER($2)
        )
        AND status = 'valid'
        AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    `;

    const result = await DatabaseConnection.queryOne<{ cert_count: string }>(sql, [
      seafarerId,
      certificationName,
    ]);

    const count = parseInt(result?.cert_count || '0', 10);
    return count > 0;
  }

  /**
   * Get training gap analysis (missing required certifications)
   * Compares required certifications for a target rank against seafarer's actual certifications
   * @param seafarerId Seafarer ID
   * @param targetRank Target rank to check requirements for
   * @returns Array of missing required certification names
   */
  static async getTrainingGaps(
    seafarerId: number,
    targetRank: string
  ): Promise<string[]> {
    // This query assumes there's a way to determine required certifications for a rank
    // It could be from a separate table, JSONB field, or hardcoded list
    // For now, we'll check against certifications that are marked as required for the rank
    
    const sql = `
      WITH required_certs_for_rank AS (
        -- Get certifications marked as required for this rank
        SELECT DISTINCT
          COALESCE(
            details->>'required_certification',
            course_name
          ) as cert_name
        FROM training_certification
        WHERE details IS NOT NULL
          AND (
            details->>'required_for_rank' = $2
            OR details->>'rank' = $2
            OR details->>'required' = 'true'
          )
        UNION
        -- Also include standard required certifications based on rank
        SELECT DISTINCT course_name as cert_name
        FROM training_certification
        WHERE details IS NOT NULL
          AND (
            details->>'is_required' = 'true'
            OR certification_type IN (
              'STCW Basic Safety',
              'STCW Advanced Fire Fighting',
              'STCW Proficiency in Survival Craft',
              'STCW Medical First Aid',
              'STCW Medical Care'
            )
          )
      ),
      seafarer_valid_certs AS (
        SELECT DISTINCT
          COALESCE(
            details->>'required_certification',
            course_name
          ) as cert_name
        FROM training_certification
        WHERE seafarer_id = $1
          AND status = 'valid'
          AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
      )
      SELECT rc.cert_name
      FROM required_certs_for_rank rc
      LEFT JOIN seafarer_valid_certs svc ON LOWER(rc.cert_name) = LOWER(svc.cert_name)
      WHERE svc.cert_name IS NULL
      ORDER BY rc.cert_name
    `;

    const results = await DatabaseConnection.query<{ cert_name: string }>(sql, [
      seafarerId,
      targetRank,
    ]);

    return results.map((row) => row.cert_name);
  }

  /**
   * Update expired certifications status
   * Marks certifications as 'expired' if expiry_date has passed
   * @param seafarerId Optional seafarer ID to update specific seafarer, or null for all
   * @returns Number of certifications updated
   */
  static async updateExpiredCertifications(
    seafarerId?: number
  ): Promise<number> {
    let sql = `
      UPDATE training_certification
      SET status = 'expired'
      WHERE status IN ('valid', 'expiring_soon')
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
    `;

    const params: any[] = [];

    if (seafarerId) {
      sql += ` AND seafarer_id = $1`;
      params.push(seafarerId);
    }

    await DatabaseConnection.query(sql, params);

    // Get count of updated records
    let countSql = `
      SELECT COUNT(*) as updated_count
      FROM training_certification
      WHERE status = 'expired'
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
    `;

    if (seafarerId) {
      countSql += ` AND seafarer_id = $1`;
    }

    const result = await DatabaseConnection.queryOne<{ updated_count: string }>(
      countSql,
      params
    );

    return parseInt(result?.updated_count || '0', 10);
  }

  /**
   * Get certifications by type
   * @param seafarerId Seafarer ID
   * @param certificationType Type of certification to filter by
   * @returns Array of certifications of the specified type
   */
  static async getCertificationsByType(
    seafarerId: number,
    certificationType: string
  ): Promise<TrainingCertification[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        course_name,
        certification_type,
        issue_date,
        expiry_date,
        issuing_authority,
        status,
        details
      FROM training_certification
      WHERE seafarer_id = $1
        AND LOWER(certification_type) = LOWER($2)
      ORDER BY issue_date DESC
    `;

    return await DatabaseConnection.query<TrainingCertification>(sql, [
      seafarerId,
      certificationType,
    ]);
  }

  /**
   * Get certifications expiring soon for all crew
   * Useful for fleet-wide monitoring
   * @param withinDays Number of days to check ahead (default: 90)
   * @param limit Maximum number of results (default: 100)
   * @returns Array of expiring certifications with seafarer info
   */
  static async getAllExpiringCertifications(
    withinDays: number = 90,
    limit: number = 100
  ): Promise<Array<TrainingCertification & { seafarer_name: string; crew_code: string }>> {
    const sql = `
      SELECT 
        tc.id,
        tc.seafarer_id,
        tc.course_name,
        tc.certification_type,
        tc.issue_date,
        tc.expiry_date,
        tc.issuing_authority,
        tc.status,
        tc.details,
        cm.seafarer_name,
        cm.crew_code
      FROM training_certification tc
      INNER JOIN crew_master cm ON tc.seafarer_id = cm.seafarer_id
      WHERE tc.expiry_date IS NOT NULL
        AND tc.expiry_date >= CURRENT_DATE
        AND tc.expiry_date <= CURRENT_DATE + INTERVAL '1 day' * $1
      ORDER BY tc.expiry_date ASC
      LIMIT $2
    `;

    const results = await DatabaseConnection.query<
      TrainingCertification & { seafarer_name: string; crew_code: string }
    >(sql, [withinDays, limit]);

    return results;
  }

  /**
   * Get certification summary for a seafarer
   * Returns counts by status
   * @param seafarerId Seafarer ID
   * @returns Object with counts by status
   */
  static async getCertificationSummary(
    seafarerId: number
  ): Promise<{
    total: number;
    valid: number;
    expiring_soon: number;
    expired: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'valid' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)) as valid,
        COUNT(*) FILTER (WHERE status = 'expiring_soon') as expiring_soon,
        COUNT(*) FILTER (WHERE status = 'expired' OR (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE)) as expired
      FROM training_certification
      WHERE seafarer_id = $1
    `;

    const result = await DatabaseConnection.queryOne<{
      total: string;
      valid: string;
      expiring_soon: string;
      expired: string;
    }>(sql, [seafarerId]);

    return {
      total: parseInt(result?.total || '0', 10),
      valid: parseInt(result?.valid || '0', 10),
      expiring_soon: parseInt(result?.expiring_soon || '0', 10),
      expired: parseInt(result?.expired || '0', 10),
    };
  }

  /**
   * Get certifications by issuing authority
   * @param seafarerId Seafarer ID
   * @param authority Issuing authority name
   * @returns Array of certifications from the specified authority
   */
  static async getCertificationsByAuthority(
    seafarerId: number,
    authority: string
  ): Promise<TrainingCertification[]> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        course_name,
        certification_type,
        issue_date,
        expiry_date,
        issuing_authority,
        status,
        details
      FROM training_certification
      WHERE seafarer_id = $1
        AND LOWER(issuing_authority) LIKE LOWER($2)
      ORDER BY issue_date DESC
    `;

    return await DatabaseConnection.query<TrainingCertification>(sql, [
      seafarerId,
      `%${authority}%`,
    ]);
  }
}
