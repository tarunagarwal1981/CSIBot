/**
 * Crew Repository
 * Database operations for crew master data and related information
 * @module services/database/repositories/crewRepository
 */

import { DatabaseConnection } from '../connection';
import { KPIRepository } from './kpiRepository';
import type {
  CrewMaster,
  KPISnapshot,
  ExperienceHistory,
  TrainingCertification,
  PerformanceEvent,
  Appraisal,
  AISummary,
} from '../../../types/database';

/**
 * Repository for crew-related database operations
 */
export class CrewRepository {
  /**
   * Get crew master information by seafarer ID
   * @param seafarerId Seafarer ID
   * @returns Crew master record or null if not found
   */
  static async getCrewById(seafarerId: number): Promise<CrewMaster | null> {
    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      WHERE seafarer_id = $1
    `;

    return await DatabaseConnection.queryOne<CrewMaster>(sql, [seafarerId]);
  }

  /**
   * Get crew master information by crew code
   * @param crewCode Crew code
   * @returns Crew master record or null if not found
   */
  static async getCrewByCode(crewCode: string): Promise<CrewMaster | null> {
    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      WHERE crew_code = $1
    `;

    return await DatabaseConnection.queryOne<CrewMaster>(sql, [crewCode]);
  }

  /**
   * Get crew by name (case-insensitive partial match)
   * @param name Name to search for
   * @returns Array of matching crew members
   */
  static async getCrewByName(name: string): Promise<CrewMaster[]> {
    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      WHERE LOWER(seafarer_name) LIKE LOWER($1)
      ORDER BY seafarer_name
      LIMIT 100
    `;

    return await DatabaseConnection.query<CrewMaster>(sql, [`%${name}%`]);
  }

  /**
   * Search crew with fuzzy search on name, code, and email
   * Uses PostgreSQL full-text search capabilities
   * @param query Search query string
   * @param limit Maximum number of results (default: 50)
   * @returns Array of matching crew members
   */
  static async searchCrew(query: string, limit: number = 50): Promise<CrewMaster[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = `%${query.trim()}%`;
    const maxLimit = Math.min(limit, 200); // Cap at 200 for performance

    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at,
        CASE
          WHEN LOWER(crew_code) = LOWER($1) THEN 1
          WHEN LOWER(seafarer_name) LIKE LOWER($2) THEN 2
          WHEN LOWER(email_id) LIKE LOWER($2) THEN 3
          ELSE 4
        END as match_priority
      FROM crew_master
      WHERE 
        LOWER(crew_code) LIKE LOWER($2)
        OR LOWER(seafarer_name) LIKE LOWER($2)
        OR LOWER(email_id) LIKE LOWER($2)
      ORDER BY match_priority, seafarer_name
      LIMIT $3
    `;

    return await DatabaseConnection.query<CrewMaster>(sql, [
      query.trim(),
      searchTerm,
      maxLimit,
    ]);
  }

  /**
   * Get complete crew profile with all related data
   * Aggregates KPI snapshot, experience, certifications, events, appraisals, and AI summaries
   * @param seafarerId Seafarer ID
   * @returns Complete crew profile object
   */
  static async getCrewProfile(seafarerId: number): Promise<{
    master: CrewMaster;
    kpis: KPISnapshot;
    experience: ExperienceHistory[];
    certifications: TrainingCertification[];
    recentEvents: PerformanceEvent[];
    latestAppraisal: Appraisal | null;
    latestSummary: AISummary | null;
  }> {
    // Get crew master info
    const master = await this.getCrewById(seafarerId);
    if (!master) {
      throw new Error(`Crew member not found with seafarer_id: ${seafarerId}`);
    }

    // Get KPI snapshot
    const kpis = await KPIRepository.getCrewKPISnapshot(seafarerId);

    // Get experience history
    const experienceSql = `
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
      ORDER BY sign_on_date DESC
    `;
    const experience = await DatabaseConnection.query<ExperienceHistory>(
      experienceSql,
      [seafarerId]
    );

    // Get training certifications
    const certificationsSql = `
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
      ORDER BY issue_date DESC
    `;
    const certifications = await DatabaseConnection.query<TrainingCertification>(
      certificationsSql,
      [seafarerId]
    );

    // Get recent performance events (last 12 months)
    const eventsSql = `
      SELECT 
        id,
        seafarer_id,
        event_type,
        event_date,
        category,
        description,
        severity,
        voyage_number,
        vessel_name,
        port,
        authority,
        outcome,
        details
      FROM performance_event
      WHERE seafarer_id = $1
        AND event_date >= CURRENT_DATE - INTERVAL '12 months'
      ORDER BY event_date DESC
      LIMIT 20
    `;
    const recentEvents = await DatabaseConnection.query<PerformanceEvent>(
      eventsSql,
      [seafarerId]
    );

    // Get latest appraisal
    const appraisalSql = `
      SELECT 
        id,
        seafarer_id,
        vessel_name,
        from_date,
        to_date,
        appraisal_date,
        status,
        appraiser_name,
        rating,
        leadership_score,
        management_score,
        teamwork_score,
        knowledge_score,
        feedback_status,
        remarks,
        details
      FROM appraisal
      WHERE seafarer_id = $1
      ORDER BY appraisal_date DESC
      LIMIT 1
    `;
    const latestAppraisal = await DatabaseConnection.queryOne<Appraisal>(
      appraisalSql,
      [seafarerId]
    );

    // Get latest AI summary
    const summarySql = `
      SELECT 
        id,
        seafarer_id,
        summary_type,
        summary_text,
        overall_rating,
        risk_level,
        strengths,
        development_areas,
        risk_indicators,
        recommendations,
        kpi_snapshot,
        generated_at,
        valid_until,
        model_version,
        tokens_used
      FROM ai_summary
      WHERE seafarer_id = $1
      ORDER BY generated_at DESC
      LIMIT 1
    `;
    const latestSummary = await DatabaseConnection.queryOne<AISummary>(
      summarySql,
      [seafarerId]
    );

    return {
      master,
      kpis,
      experience,
      certifications,
      recentEvents,
      latestAppraisal,
      latestSummary,
    };
  }

  /**
   * Get crew list by sailing status
   * @param status Sailing status ('atsea' or 'onleave')
   * @param limit Maximum number of results (default: 100)
   * @returns Array of crew members with the specified status
   */
  static async getCrewByStatus(
    status: 'atsea' | 'onleave',
    limit: number = 100
  ): Promise<CrewMaster[]> {
    const maxLimit = Math.min(limit, 1000); // Cap at 1000 for performance

    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      WHERE sailing_status = $1
      ORDER BY seafarer_name
      LIMIT $2
    `;

    return await DatabaseConnection.query<CrewMaster>(sql, [status, maxLimit]);
  }

  /**
   * Get crew by rank
   * @param rank Rank name (e.g., "Chief Engineer", "Captain")
   * @returns Array of crew members with the specified rank
   */
  static async getCrewByRank(rank: string): Promise<CrewMaster[]> {
    const sql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      WHERE current_rank_name = $1
      ORDER BY seafarer_name
    `;

    return await DatabaseConnection.query<CrewMaster>(sql, [rank]);
  }

  /**
   * Get crew members needing summary refresh
   * Returns seafarer IDs whose latest AI summary is older than 15 days
   * @returns Array of seafarer IDs needing summary refresh
   */
  static async getCrewNeedingSummaryRefresh(): Promise<number[]> {
    const sql = `
      WITH latest_summaries AS (
        SELECT DISTINCT ON (seafarer_id)
          seafarer_id,
          generated_at,
          valid_until
        FROM ai_summary
        ORDER BY seafarer_id, generated_at DESC
      )
      SELECT seafarer_id
      FROM latest_summaries
      WHERE 
        generated_at < CURRENT_DATE - INTERVAL '15 days'
        OR valid_until < CURRENT_DATE
        OR seafarer_id NOT IN (SELECT DISTINCT seafarer_id FROM ai_summary)
    `;

    const results = await DatabaseConnection.query<{ seafarer_id: number }>(sql);
    return results.map((row) => row.seafarer_id);
  }

  /**
   * Update crew master information
   * Only updates provided fields
   * @param seafarerId Seafarer ID
   * @param updates Partial crew master object with fields to update
   * @throws Error if crew member not found or update fails
   */
  static async updateCrew(
    seafarerId: number,
    updates: Partial<CrewMaster>
  ): Promise<void> {
    // Validate that crew exists
    const existing = await this.getCrewById(seafarerId);
    if (!existing) {
      throw new Error(`Crew member not found with seafarer_id: ${seafarerId}`);
    }

    // Build dynamic update query
    const allowedFields = [
      'crew_code',
      'seafarer_name',
      'email_id',
      'current_rank_name',
      'contact_number',
      'sailing_status',
      'department_name',
      'pod_name',
    ];

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());
    paramIndex++;

    // Add seafarer_id for WHERE clause
    updateValues.push(seafarerId);

    const sql = `
      UPDATE crew_master
      SET ${updateFields.join(', ')}
      WHERE seafarer_id = $${paramIndex}
    `;

    await DatabaseConnection.query(sql, updateValues);
  }

  /**
   * Get crew list with pagination support
   * @param page Page number (1-based)
   * @param pageSize Number of items per page
   * @param filters Optional filters (status, rank, department)
   * @returns Paginated crew list with total count
   */
  static async getCrewList(
    page: number = 1,
    pageSize: number = 50,
    filters?: {
      status?: 'atsea' | 'onleave';
      rank?: string;
      department?: string;
    }
  ): Promise<{
    crew: CrewMaster[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;
    const maxPageSize = Math.min(pageSize, 200); // Cap at 200

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      whereClause += ` AND sailing_status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.rank) {
      whereClause += ` AND current_rank_name = $${paramIndex}`;
      params.push(filters.rank);
      paramIndex++;
    }

    if (filters?.department) {
      whereClause += ` AND department_name = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM crew_master
      ${whereClause}
    `;
    const countResult = await DatabaseConnection.queryOne<{ total: string }>(
      countSql,
      params
    );
    const total = parseInt(countResult?.total || '0', 10);

    // Get paginated results
    const dataSql = `
      SELECT 
        seafarer_id,
        crew_code,
        seafarer_name,
        email_id,
        current_rank_name,
        contact_number,
        sailing_status,
        department_name,
        pod_name,
        updated_at AS created_at,
        updated_at
      FROM crew_master
      ${whereClause}
      ORDER BY seafarer_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(maxPageSize, offset);

    const crew = await DatabaseConnection.query<CrewMaster>(dataSql, params);

    return {
      crew,
      total,
      page,
      pageSize: maxPageSize,
      totalPages: Math.ceil(total / maxPageSize),
    };
  }

  /**
   * Get crew count by status
   * @returns Object with counts for each status
   */
  static async getCrewCountByStatus(): Promise<{
    atsea: number;
    onleave: number;
    total: number;
  }> {
    const sql = `
      SELECT 
        sailing_status,
        COUNT(*) as count
      FROM crew_master
      GROUP BY sailing_status
    `;

    const results = await DatabaseConnection.query<{
      sailing_status: 'atsea' | 'onleave';
      count: string;
    }>(sql);

    const counts = {
      atsea: 0,
      onleave: 0,
      total: 0,
    };

    for (const row of results) {
      const count = parseInt(row.count, 10);
      counts[row.sailing_status] = count;
      counts.total += count;
    }

    return counts;
  }

  /**
   * Get crew count by rank
   * @returns Array of rank names with their counts
   */
  static async getCrewCountByRank(): Promise<Array<{ rank: string; count: number }>> {
    const sql = `
      SELECT 
        current_rank_name as rank,
        COUNT(*) as count
      FROM crew_master
      GROUP BY current_rank_name
      ORDER BY count DESC, current_rank_name
    `;

    const results = await DatabaseConnection.query<{ rank: string; count: string }>(sql);

    return results.map((row) => ({
      rank: row.rank,
      count: parseInt(row.count, 10),
    }));
  }
}
