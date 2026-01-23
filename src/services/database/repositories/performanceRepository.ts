/**
 * Performance Repository
 * Database operations for performance events, incidents, inspections, and appraisals
 * @module services/database/repositories/performanceRepository
 */

import { DatabaseConnection } from '../connection';
import type { PerformanceEvent } from '../../../types/database';

/**
 * Repository for performance-related database operations
 */
export class PerformanceRepository {
  /**
   * Get all performance events with optional filtering
   * @param seafarerId Seafarer ID
   * @param eventType Optional event type filter ('failure', 'inspection', 'incident', 'appraisal')
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @returns Array of performance events
   */
  static async getPerformanceEvents(
    seafarerId: number,
    eventType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceEvent[]> {
    let sql = `
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
    `;

    const params: any[] = [seafarerId];
    let paramIndex = 2;

    if (eventType) {
      sql += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (startDate) {
      sql += ` AND event_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      sql += ` AND event_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    sql += ` ORDER BY event_date DESC`;

    return await DatabaseConnection.query<PerformanceEvent>(sql, params);
  }

  /**
   * Get last failure event
   * Returns the most recent failure event for the seafarer
   * @param seafarerId Seafarer ID
   * @returns Most recent failure event or null if none found
   */
  static async getLastFailure(seafarerId: number): Promise<PerformanceEvent | null> {
    const sql = `
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
        AND event_type = 'failure'
      ORDER BY event_date DESC
      LIMIT 1
    `;

    return await DatabaseConnection.queryOne<PerformanceEvent>(sql, [seafarerId]);
  }

  /**
   * Calculate days since last failure
   * Returns number of days since the most recent failure event
   * @param seafarerId Seafarer ID
   * @returns Number of days since last failure, or -1 if no failure found
   */
  static async getDaysSinceLastFailure(seafarerId: number): Promise<number> {
    const sql = `
      SELECT 
        EXTRACT(EPOCH FROM (CURRENT_DATE - event_date)) / 86400 as days_since
      FROM performance_event
      WHERE seafarer_id = $1
        AND event_type = 'failure'
      ORDER BY event_date DESC
      LIMIT 1
    `;

    const result = await DatabaseConnection.queryOne<{ days_since: number }>(sql, [
      seafarerId,
    ]);

    if (!result || result.days_since === null) {
      return -1; // No failure found
    }

    return Math.floor(result.days_since);
  }

  /**
   * Get failure clustering analysis
   * Detects if there are multiple failures within a short time window
   * @param seafarerId Seafarer ID
   * @param windowDays Time window in days to check for clustering (default: 30)
   * @returns Clustering analysis with cluster count and period
   */
  static async getFailureClustering(
    seafarerId: number,
    windowDays: number = 30
  ): Promise<{
    hasCluster: boolean;
    clusterCount: number;
    clusterPeriod: { start: Date; end: Date } | null;
  }> {
    const sql = `
      WITH failure_events AS (
        SELECT 
          event_date,
          LAG(event_date) OVER (ORDER BY event_date DESC) as prev_event_date
        FROM performance_event
        WHERE seafarer_id = $1
          AND event_type = 'failure'
        ORDER BY event_date DESC
      ),
      clusters AS (
        SELECT 
          event_date,
          prev_event_date,
          CASE 
            WHEN prev_event_date IS NOT NULL 
              AND (event_date - prev_event_date) <= INTERVAL '1 day' * $2
            THEN 1
            ELSE 0
          END as is_clustered
        FROM failure_events
      ),
      cluster_groups AS (
        SELECT 
          MIN(event_date) as cluster_start,
          MAX(event_date) as cluster_end,
          COUNT(*) as cluster_size
        FROM (
          SELECT 
            event_date,
            SUM(CASE WHEN is_clustered = 0 THEN 1 ELSE 0 END) 
              OVER (ORDER BY event_date DESC) as cluster_id
          FROM clusters
          WHERE is_clustered = 1 OR prev_event_date IS NULL
        ) grouped
        GROUP BY cluster_id
        HAVING COUNT(*) >= 2
      )
      SELECT 
        CASE WHEN COUNT(*) > 0 THEN true ELSE false END as has_cluster,
        COALESCE(MAX(cluster_size), 0) as cluster_count,
        MIN(cluster_start) as period_start,
        MAX(cluster_end) as period_end
      FROM cluster_groups
    `;

    const result = await DatabaseConnection.queryOne<{
      has_cluster: boolean;
      cluster_count: number;
      period_start: Date | null;
      period_end: Date | null;
    }>(sql, [seafarerId, windowDays]);

    if (!result || !result.has_cluster) {
      return {
        hasCluster: false,
        clusterCount: 0,
        clusterPeriod: null,
      };
    }

    return {
      hasCluster: true,
      clusterCount: result.cluster_count,
      clusterPeriod: result.period_start && result.period_end
        ? {
            start: result.period_start,
            end: result.period_end,
          }
        : null,
    };
  }

  /**
   * Get inspection history
   * Returns inspections filtered by positive/negative outcome
   * @param seafarerId Seafarer ID
   * @param positive If true, returns positive inspections; if false, returns negative
   * @param withinYears Number of years to look back (default: 3)
   * @returns Array of inspection events
   */
  static async getInspections(
    seafarerId: number,
    positive: boolean,
    withinYears: number = 3
  ): Promise<PerformanceEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

    let sql = `
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
        AND event_type = 'inspection'
        AND event_date >= $2
    `;

    const params: any[] = [seafarerId, cutoffDate];

    if (positive) {
      // Positive inspections: outcome is 'resolved' or severity is null/low, or details indicate positive
      sql += `
        AND (
          outcome = 'resolved'
          OR severity IS NULL
          OR severity = 'low'
          OR (details IS NOT NULL AND (
            details->>'result' = 'pass'
            OR details->>'result' = 'satisfactory'
            OR details->>'passed' = 'true'
          ))
        )
      `;
    } else {
      // Negative inspections: outcome is 'pending'/'recurrent' or severity is high/critical, or details indicate failure
      sql += `
        AND (
          outcome IN ('pending', 'recurrent')
          OR severity IN ('high', 'critical')
          OR (details IS NOT NULL AND (
            details->>'result' = 'fail'
            OR details->>'result' = 'unsatisfactory'
            OR details->>'passed' = 'false'
          ))
        )
      `;
    }

    sql += ` ORDER BY event_date DESC`;

    return await DatabaseConnection.query<PerformanceEvent>(sql, params);
  }

  /**
   * Calculate voyage success rate
   * Calculates percentage of successful voyages (no failures/incidents) within time period
   * @param seafarerId Seafarer ID
   * @param withinMonths Number of months to look back (default: 12)
   * @returns Success rate as percentage (0-100)
   */
  static async getVoyageSuccessRate(
    seafarerId: number,
    withinMonths: number = 12
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - withinMonths);

    const sql = `
      WITH voyage_events AS (
        SELECT DISTINCT
          voyage_number,
          vessel_name,
          event_date,
          CASE 
            WHEN event_type IN ('failure', 'incident') 
              AND (severity IN ('high', 'critical') OR outcome = 'recurrent')
            THEN 1
            ELSE 0
          END as has_failure
        FROM performance_event
        WHERE seafarer_id = $1
          AND event_date >= $2
          AND voyage_number IS NOT NULL
      ),
      voyage_summary AS (
        SELECT 
          voyage_number,
          vessel_name,
          MAX(has_failure) as has_failure
        FROM voyage_events
        GROUP BY voyage_number, vessel_name
      )
      SELECT 
        COUNT(*) as total_voyages,
        SUM(has_failure) as failed_voyages
      FROM voyage_summary
    `;

    const result = await DatabaseConnection.queryOne<{
      total_voyages: number;
      failed_voyages: number;
    }>(sql, [seafarerId, cutoffDate]);

    if (!result || result.total_voyages === 0) {
      return 100; // No voyages = 100% success rate
    }

    const successRate =
      ((result.total_voyages - result.failed_voyages) / result.total_voyages) * 100;
    return Math.round(successRate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get major incidents count
   * Counts incidents with high or critical severity within time period
   * @param seafarerId Seafarer ID
   * @param withinYears Number of years to look back (default: 3)
   * @returns Count of major incidents
   */
  static async getMajorIncidentsCount(
    seafarerId: number,
    withinYears: number = 3
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

    const sql = `
      SELECT COUNT(*) as incident_count
      FROM performance_event
      WHERE seafarer_id = $1
        AND event_type = 'incident'
        AND event_date >= $2
        AND severity IN ('high', 'critical')
    `;

    const result = await DatabaseConnection.queryOne<{ incident_count: string }>(sql, [
      seafarerId,
      cutoffDate,
    ]);

    return parseInt(result?.incident_count || '0', 10);
  }

  /**
   * Get detention count
   * Counts detentions (typically stored in details or as specific event type)
   * @param seafarerId Seafarer ID
   * @param withinYears Number of years to look back (default: 3)
   * @returns Count of detentions
   */
  static async getDetentionCount(
    seafarerId: number,
    withinYears: number = 3
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

    const sql = `
      SELECT COUNT(*) as detention_count
      FROM performance_event
      WHERE seafarer_id = $1
        AND event_date >= $2
        AND (
          LOWER(category) LIKE '%detention%'
          OR LOWER(description) LIKE '%detention%'
          OR (details IS NOT NULL AND (
            details->>'detention' = 'true'
            OR details->>'is_detention' = 'true'
            OR LOWER(details->>'event_category') LIKE '%detention%'
          ))
        )
    `;

    const result = await DatabaseConnection.queryOne<{ detention_count: string }>(sql, [
      seafarerId,
      cutoffDate,
    ]);

    return parseInt(result?.detention_count || '0', 10);
  }

  /**
   * Get performance events by severity
   * @param seafarerId Seafarer ID
   * @param severity Severity level to filter by
   * @param withinYears Number of years to look back (default: 3)
   * @returns Array of performance events with specified severity
   */
  static async getEventsBySeverity(
    seafarerId: number,
    severity: 'critical' | 'high' | 'medium' | 'low',
    withinYears: number = 3
  ): Promise<PerformanceEvent[]> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

    const sql = `
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
        AND severity = $2
        AND event_date >= $3
      ORDER BY event_date DESC
    `;

    return await DatabaseConnection.query<PerformanceEvent>(sql, [
      seafarerId,
      severity,
      cutoffDate,
    ]);
  }

  /**
   * Get performance trend analysis
   * Analyzes performance events over time to detect trends
   * @param seafarerId Seafarer ID
   * @param withinMonths Number of months to analyze (default: 12)
   * @returns Trend analysis with event counts by period
   */
  static async getPerformanceTrend(
    seafarerId: number,
    withinMonths: number = 12
  ): Promise<{
    periods: Array<{
      period: string;
      failureCount: number;
      incidentCount: number;
      inspectionCount: number;
    }>;
    overallTrend: 'improving' | 'stable' | 'declining';
  }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - withinMonths);

    const sql = `
      WITH monthly_events AS (
        SELECT 
          DATE_TRUNC('month', event_date) as month,
          event_type,
          COUNT(*) as event_count
        FROM performance_event
        WHERE seafarer_id = $1
          AND event_date >= $2
        GROUP BY DATE_TRUNC('month', event_date), event_type
      ),
      period_summary AS (
        SELECT 
          TO_CHAR(month, 'YYYY-MM') as period,
          SUM(CASE WHEN event_type = 'failure' THEN event_count ELSE 0 END) as failures,
          SUM(CASE WHEN event_type = 'incident' THEN event_count ELSE 0 END) as incidents,
          SUM(CASE WHEN event_type = 'inspection' THEN event_count ELSE 0 END) as inspections
        FROM monthly_events
        GROUP BY month
        ORDER BY month DESC
      )
      SELECT 
        period,
        failures,
        incidents,
        inspections
      FROM period_summary
    `;

    const results = await DatabaseConnection.query<{
      period: string;
      failures: number;
      incidents: number;
      inspections: number;
    }>(sql, [seafarerId, cutoffDate]);

    const periods = results.map((row) => ({
      period: row.period,
      failureCount: row.failures,
      incidentCount: row.incidents,
      inspectionCount: row.inspections,
    }));

    // Determine overall trend
    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (periods.length >= 2) {
      const recent = periods[0].failureCount + periods[0].incidentCount;
      const previous = periods[1].failureCount + periods[1].incidentCount;

      if (recent < previous) {
        overallTrend = 'improving';
      } else if (recent > previous) {
        overallTrend = 'declining';
      }
    }

    return {
      periods,
      overallTrend,
    };
  }

  /**
   * Get unresolved events count
   * Counts events with pending or recurrent outcomes
   * @param seafarerId Seafarer ID
   * @returns Count of unresolved events
   */
  static async getUnresolvedEventsCount(seafarerId: number): Promise<number> {
    const sql = `
      SELECT COUNT(*) as unresolved_count
      FROM performance_event
      WHERE seafarer_id = $1
        AND outcome IN ('pending', 'recurrent')
    `;

    const result = await DatabaseConnection.queryOne<{ unresolved_count: string }>(
      sql,
      [seafarerId]
    );

    return parseInt(result?.unresolved_count || '0', 10);
  }

  /**
   * Get performance summary
   * Returns comprehensive performance statistics
   * @param seafarerId Seafarer ID
   * @param withinYears Number of years to analyze (default: 3)
   * @returns Performance summary object
   */
  static async getPerformanceSummary(
    seafarerId: number,
    withinYears: number = 3
  ): Promise<{
    totalEvents: number;
    failures: number;
    incidents: number;
    inspections: number;
    majorIncidents: number;
    detentions: number;
    unresolvedEvents: number;
    daysSinceLastFailure: number;
    hasFailureCluster: boolean;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - withinYears);

    const sql = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE event_type = 'failure') as failures,
        COUNT(*) FILTER (WHERE event_type = 'incident') as incidents,
        COUNT(*) FILTER (WHERE event_type = 'inspection') as inspections,
        COUNT(*) FILTER (WHERE event_type = 'incident' AND severity IN ('high', 'critical')) as major_incidents,
        COUNT(*) FILTER (WHERE LOWER(category) LIKE '%detention%' OR LOWER(description) LIKE '%detention%') as detentions,
        COUNT(*) FILTER (WHERE outcome IN ('pending', 'recurrent')) as unresolved
      FROM performance_event
      WHERE seafarer_id = $1
        AND event_date >= $2
    `;

    const result = await DatabaseConnection.queryOne<{
      total_events: string;
      failures: string;
      incidents: string;
      inspections: string;
      major_incidents: string;
      detentions: string;
      unresolved: string;
    }>(sql, [seafarerId, cutoffDate]);

    const daysSinceLastFailure = await this.getDaysSinceLastFailure(seafarerId);
    const clustering = await this.getFailureClustering(seafarerId);

    return {
      totalEvents: parseInt(result?.total_events || '0', 10),
      failures: parseInt(result?.failures || '0', 10),
      incidents: parseInt(result?.incidents || '0', 10),
      inspections: parseInt(result?.inspections || '0', 10),
      majorIncidents: parseInt(result?.major_incidents || '0', 10),
      detentions: parseInt(result?.detentions || '0', 10),
      unresolvedEvents: parseInt(result?.unresolved || '0', 10),
      daysSinceLastFailure: daysSinceLastFailure === -1 ? 0 : daysSinceLastFailure,
      hasFailureCluster: clustering.hasCluster,
    };
  }
}
