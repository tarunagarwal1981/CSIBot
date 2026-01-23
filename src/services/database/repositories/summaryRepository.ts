/**
 * Summary Repository
 * Database operations for AI-generated performance summaries
 * @module services/database/repositories/summaryRepository
 */

import { DatabaseConnection } from '../connection';
import type { AISummary } from '../../../types/database';

/**
 * Repository for AI summary-related database operations
 */
export class SummaryRepository {
  /**
   * Save new AI-generated summary
   * Inserts a new summary record and returns the generated ID
   * @param summary Summary data without id and generated_at (will be auto-generated)
   * @returns The ID of the newly created summary
   */
  static async saveSummary(
    summary: Omit<AISummary, 'id' | 'generated_at'>
  ): Promise<number> {
    const sql = `
      INSERT INTO ai_summary (
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
        valid_until,
        model_version,
        tokens_used
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING id
    `;

    const result = await DatabaseConnection.queryOne<{ id: number }>(sql, [
      summary.seafarer_id,
      summary.summary_type,
      summary.summary_text,
      summary.overall_rating,
      summary.risk_level,
      JSON.stringify(summary.strengths),
      JSON.stringify(summary.development_areas),
      JSON.stringify(summary.risk_indicators),
      JSON.stringify(summary.recommendations),
      JSON.stringify(summary.kpi_snapshot),
      summary.valid_until,
      summary.model_version,
      summary.tokens_used,
    ]);

    if (!result) {
      throw new Error('Failed to save summary');
    }

    return result.id;
  }

  /**
   * Get latest summary for a seafarer
   * Returns the most recent summary, optionally filtered by type
   * @param seafarerId Seafarer ID
   * @param summaryType Optional summary type filter ('performance', 'risk', 'promotion_readiness')
   * @returns Latest summary or null if not found
   */
  static async getLatestSummary(
    seafarerId: number,
    summaryType?: string
  ): Promise<AISummary | null> {
    let sql = `
      SELECT 
        id,
        seafarer_id,
        summary_type,
        summary_text,
        overall_rating,
        risk_level,
        strengths::jsonb as strengths,
        development_areas::jsonb as development_areas,
        risk_indicators::jsonb as risk_indicators,
        recommendations::jsonb as recommendations,
        kpi_snapshot::jsonb as kpi_snapshot,
        generated_at,
        valid_until,
        model_version,
        tokens_used
      FROM ai_summary
      WHERE seafarer_id = $1
    `;

    const params: any[] = [seafarerId];

    if (summaryType) {
      sql += ` AND summary_type = $2`;
      params.push(summaryType);
    }

    sql += ` ORDER BY generated_at DESC LIMIT 1`;

    const result = await DatabaseConnection.queryOne<{
      id: number;
      seafarer_id: number;
      summary_type: string;
      summary_text: string;
      overall_rating: string;
      risk_level: string;
      strengths: any;
      development_areas: any;
      risk_indicators: any;
      recommendations: any;
      kpi_snapshot: any;
      generated_at: Date;
      valid_until: Date;
      model_version: string;
      tokens_used: number;
    }>(sql, params);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      seafarer_id: result.seafarer_id,
      summary_type: result.summary_type as 'performance' | 'risk' | 'promotion_readiness',
      summary_text: result.summary_text,
      overall_rating: result.overall_rating,
      risk_level: result.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      strengths: result.strengths,
      development_areas: result.development_areas,
      risk_indicators: result.risk_indicators,
      recommendations: result.recommendations,
      kpi_snapshot: result.kpi_snapshot,
      generated_at: result.generated_at,
      valid_until: result.valid_until,
      model_version: result.model_version,
      tokens_used: result.tokens_used,
    };
  }

  /**
   * Get summary history for a seafarer
   * Returns all summaries ordered by most recent first
   * @param seafarerId Seafarer ID
   * @param limit Maximum number of summaries to return (default: 10)
   * @returns Array of summaries
   */
  static async getSummaryHistory(
    seafarerId: number,
    limit: number = 10
  ): Promise<AISummary[]> {
    const maxLimit = Math.min(limit, 100); // Cap at 100

    const sql = `
      SELECT 
        id,
        seafarer_id,
        summary_type,
        summary_text,
        overall_rating,
        risk_level,
        strengths::jsonb as strengths,
        development_areas::jsonb as development_areas,
        risk_indicators::jsonb as risk_indicators,
        recommendations::jsonb as recommendations,
        kpi_snapshot::jsonb as kpi_snapshot,
        generated_at,
        valid_until,
        model_version,
        tokens_used
      FROM ai_summary
      WHERE seafarer_id = $1
      ORDER BY generated_at DESC
      LIMIT $2
    `;

    const results = await DatabaseConnection.query<{
      id: number;
      seafarer_id: number;
      summary_type: string;
      summary_text: string;
      overall_rating: string;
      risk_level: string;
      strengths: any;
      development_areas: any;
      risk_indicators: any;
      recommendations: any;
      kpi_snapshot: any;
      generated_at: Date;
      valid_until: Date;
      model_version: string;
      tokens_used: number;
    }>(sql, [seafarerId, maxLimit]);

    return results.map((result) => ({
      id: result.id,
      seafarer_id: result.seafarer_id,
      summary_type: result.summary_type as 'performance' | 'risk' | 'promotion_readiness',
      summary_text: result.summary_text,
      overall_rating: result.overall_rating,
      risk_level: result.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      strengths: result.strengths,
      development_areas: result.development_areas,
      risk_indicators: result.risk_indicators,
      recommendations: result.recommendations,
      kpi_snapshot: result.kpi_snapshot,
      generated_at: result.generated_at,
      valid_until: result.valid_until,
      model_version: result.model_version,
      tokens_used: result.tokens_used,
    }));
  }

  /**
   * Check if summary needs refresh
   * Determines if the latest summary is older than the refresh threshold
   * @param seafarerId Seafarer ID
   * @param refreshDays Number of days before refresh is needed (default: 15)
   * @returns true if summary needs refresh, false otherwise
   */
  static async needsRefresh(
    seafarerId: number,
    refreshDays: number = 15
  ): Promise<boolean> {
    const sql = `
      SELECT 
        CASE 
          WHEN COUNT(*) = 0 THEN true
          WHEN MAX(generated_at) < CURRENT_DATE - INTERVAL '1 day' * $2 THEN true
          WHEN MAX(valid_until) < CURRENT_DATE THEN true
          ELSE false
        END as needs_refresh
      FROM ai_summary
      WHERE seafarer_id = $1
    `;

    const result = await DatabaseConnection.queryOne<{ needs_refresh: boolean }>(sql, [
      seafarerId,
      refreshDays,
    ]);

    return result?.needs_refresh ?? true;
  }

  /**
   * Get summaries that need regeneration
   * Returns seafarer IDs whose summaries need to be refreshed
   * @param refreshDays Number of days before refresh is needed (default: 15)
   * @returns Array of seafarer IDs needing summary refresh
   */
  static async getSummariesNeedingRefresh(
    refreshDays: number = 15
  ): Promise<number[]> {
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
        generated_at < CURRENT_DATE - INTERVAL '1 day' * $1
        OR valid_until < CURRENT_DATE
    `;

    const results = await DatabaseConnection.query<{ seafarer_id: number }>(sql, [
      refreshDays,
    ]);

    return results.map((row) => row.seafarer_id);
  }

  /**
   * Compare two summaries to track changes
   * Analyzes differences between old and new summaries
   * @param oldSummaryId ID of the older summary
   * @param newSummaryId ID of the newer summary
   * @returns Comparison results with detected changes
   */
  static async compareSummaries(
    oldSummaryId: number,
    newSummaryId: number
  ): Promise<{
    riskLevelChange: boolean;
    newRisks: string[];
    resolvedRisks: string[];
    trendChange: boolean;
  }> {
    const sql = `
      WITH old_summary AS (
        SELECT 
          risk_level,
          risk_indicators::jsonb as risk_indicators,
          overall_rating
        FROM ai_summary
        WHERE id = $1
      ),
      new_summary AS (
        SELECT 
          risk_level,
          risk_indicators::jsonb as risk_indicators,
          overall_rating
        FROM ai_summary
        WHERE id = $2
      )
      SELECT 
        os.risk_level as old_risk_level,
        ns.risk_level as new_risk_level,
        os.risk_indicators as old_risk_indicators,
        ns.risk_indicators as new_risk_indicators,
        os.overall_rating as old_rating,
        ns.overall_rating as new_rating
      FROM old_summary os
      CROSS JOIN new_summary ns
    `;

    const result = await DatabaseConnection.queryOne<{
      old_risk_level: string;
      new_risk_level: string;
      old_risk_indicators: any;
      new_risk_indicators: any;
      old_rating: string;
      new_rating: string;
    }>(sql, [oldSummaryId, newSummaryId]);

    if (!result) {
      throw new Error('One or both summaries not found');
    }

    // Check if risk level changed
    const riskLevelChange = result.old_risk_level !== result.new_risk_level;

    // Extract risk descriptions for comparison
    const oldRisks = Array.isArray(result.old_risk_indicators)
      ? result.old_risk_indicators.map((r: any) => r.description || r.category || '').filter(Boolean)
      : [];
    const newRisks = Array.isArray(result.new_risk_indicators)
      ? result.new_risk_indicators.map((r: any) => r.description || r.category || '').filter(Boolean)
      : [];

    // Find new risks (in new but not in old)
    const newRisksList = newRisks.filter(
      (risk) => !oldRisks.some((oldRisk) => oldRisk.toLowerCase() === risk.toLowerCase())
    );

    // Find resolved risks (in old but not in new)
    const resolvedRisksList = oldRisks.filter(
      (risk) => !newRisks.some((newRisk) => newRisk.toLowerCase() === risk.toLowerCase())
    );

    // Check if trend changed (overall rating change)
    const trendChange = result.old_rating !== result.new_rating;

    return {
      riskLevelChange,
      newRisks: newRisksList,
      resolvedRisks: resolvedRisksList,
      trendChange,
    };
  }

  /**
   * Get summary by ID
   * @param summaryId Summary ID
   * @returns Summary or null if not found
   */
  static async getSummaryById(summaryId: number): Promise<AISummary | null> {
    const sql = `
      SELECT 
        id,
        seafarer_id,
        summary_type,
        summary_text,
        overall_rating,
        risk_level,
        strengths::jsonb as strengths,
        development_areas::jsonb as development_areas,
        risk_indicators::jsonb as risk_indicators,
        recommendations::jsonb as recommendations,
        kpi_snapshot::jsonb as kpi_snapshot,
        generated_at,
        valid_until,
        model_version,
        tokens_used
      FROM ai_summary
      WHERE id = $1
    `;

    const result = await DatabaseConnection.queryOne<{
      id: number;
      seafarer_id: number;
      summary_type: string;
      summary_text: string;
      overall_rating: string;
      risk_level: string;
      strengths: any;
      development_areas: any;
      risk_indicators: any;
      recommendations: any;
      kpi_snapshot: any;
      generated_at: Date;
      valid_until: Date;
      model_version: string;
      tokens_used: number;
    }>(sql, [summaryId]);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      seafarer_id: result.seafarer_id,
      summary_type: result.summary_type as 'performance' | 'risk' | 'promotion_readiness',
      summary_text: result.summary_text,
      overall_rating: result.overall_rating,
      risk_level: result.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      strengths: result.strengths,
      development_areas: result.development_areas,
      risk_indicators: result.risk_indicators,
      recommendations: result.recommendations,
      kpi_snapshot: result.kpi_snapshot,
      generated_at: result.generated_at,
      valid_until: result.valid_until,
      model_version: result.model_version,
      tokens_used: result.tokens_used,
    };
  }

  /**
   * Delete old summaries (cleanup)
   * Removes summaries older than specified days, keeping only the latest per seafarer
   * @param olderThanDays Delete summaries older than this many days
   * @returns Number of summaries deleted
   */
  static async deleteOldSummaries(olderThanDays: number): Promise<number> {
    // First, get count of summaries to be deleted
    const countSql = `
      WITH latest_summaries AS (
        SELECT DISTINCT ON (seafarer_id)
          id
        FROM ai_summary
        ORDER BY seafarer_id, generated_at DESC
      )
      SELECT COUNT(*) as delete_count
      FROM ai_summary
      WHERE generated_at < CURRENT_DATE - INTERVAL '1 day' * $1
        AND id NOT IN (SELECT id FROM latest_summaries)
    `;

    const countResult = await DatabaseConnection.queryOne<{ delete_count: string }>(
      countSql,
      [olderThanDays]
    );

    // Delete old summaries (but keep the latest one per seafarer)
    const deleteSql = `
      WITH latest_summaries AS (
        SELECT DISTINCT ON (seafarer_id)
          id
        FROM ai_summary
        ORDER BY seafarer_id, generated_at DESC
      )
      DELETE FROM ai_summary
      WHERE generated_at < CURRENT_DATE - INTERVAL '1 day' * $1
        AND id NOT IN (SELECT id FROM latest_summaries)
    `;

    await DatabaseConnection.query(deleteSql, [olderThanDays]);

    return parseInt(countResult?.delete_count || '0', 10);
  }

  /**
   * Get summary statistics
   * Returns counts and statistics about summaries
   * @param seafarerId Optional seafarer ID to filter by
   * @returns Summary statistics
   */
  static async getSummaryStatistics(
    seafarerId?: number
  ): Promise<{
    totalSummaries: number;
    byType: Record<string, number>;
    byRiskLevel: Record<string, number>;
    averageTokens: number;
    oldestSummary: Date | null;
    newestSummary: Date | null;
  }> {
    let sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE summary_type = 'performance') as performance_count,
        COUNT(*) FILTER (WHERE summary_type = 'risk') as risk_count,
        COUNT(*) FILTER (WHERE summary_type = 'promotion_readiness') as promotion_count,
        COUNT(*) FILTER (WHERE risk_level = 'LOW') as low_risk,
        COUNT(*) FILTER (WHERE risk_level = 'MEDIUM') as medium_risk,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk,
        COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_risk,
        AVG(tokens_used) as avg_tokens,
        MIN(generated_at) as oldest,
        MAX(generated_at) as newest
      FROM ai_summary
    `;

    const params: any[] = [];

    if (seafarerId) {
      sql += ` WHERE seafarer_id = $1`;
      params.push(seafarerId);
    }

    const result = await DatabaseConnection.queryOne<{
      total: string;
      performance_count: string;
      risk_count: string;
      promotion_count: string;
      low_risk: string;
      medium_risk: string;
      high_risk: string;
      critical_risk: string;
      avg_tokens: number | null;
      oldest: Date | null;
      newest: Date | null;
    }>(sql, params);

    if (!result) {
      return {
        totalSummaries: 0,
        byType: {},
        byRiskLevel: {},
        averageTokens: 0,
        oldestSummary: null,
        newestSummary: null,
      };
    }

    return {
      totalSummaries: parseInt(result.total || '0', 10),
      byType: {
        performance: parseInt(result.performance_count || '0', 10),
        risk: parseInt(result.risk_count || '0', 10),
        promotion_readiness: parseInt(result.promotion_count || '0', 10),
      },
      byRiskLevel: {
        LOW: parseInt(result.low_risk || '0', 10),
        MEDIUM: parseInt(result.medium_risk || '0', 10),
        HIGH: parseInt(result.high_risk || '0', 10),
        CRITICAL: parseInt(result.critical_risk || '0', 10),
      },
      averageTokens: Math.round((result.avg_tokens || 0) * 100) / 100,
      oldestSummary: result.oldest,
      newestSummary: result.newest,
    };
  }

  /**
   * Get summaries by risk level
   * Returns summaries filtered by risk level
   * @param riskLevel Risk level to filter by
   * @param limit Maximum number of results (default: 50)
   * @returns Array of summaries with the specified risk level
   */
  static async getSummariesByRiskLevel(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit: number = 50
  ): Promise<AISummary[]> {
    const maxLimit = Math.min(limit, 200);

    const sql = `
      SELECT 
        id,
        seafarer_id,
        summary_type,
        summary_text,
        overall_rating,
        risk_level,
        strengths::jsonb as strengths,
        development_areas::jsonb as development_areas,
        risk_indicators::jsonb as risk_indicators,
        recommendations::jsonb as recommendations,
        kpi_snapshot::jsonb as kpi_snapshot,
        generated_at,
        valid_until,
        model_version,
        tokens_used
      FROM ai_summary
      WHERE risk_level = $1
      ORDER BY generated_at DESC
      LIMIT $2
    `;

    const results = await DatabaseConnection.query<{
      id: number;
      seafarer_id: number;
      summary_type: string;
      summary_text: string;
      overall_rating: string;
      risk_level: string;
      strengths: any;
      development_areas: any;
      risk_indicators: any;
      recommendations: any;
      kpi_snapshot: any;
      generated_at: Date;
      valid_until: Date;
      model_version: string;
      tokens_used: number;
    }>(sql, [riskLevel, maxLimit]);

    return results.map((result) => ({
      id: result.id,
      seafarer_id: result.seafarer_id,
      summary_type: result.summary_type as 'performance' | 'risk' | 'promotion_readiness',
      summary_text: result.summary_text,
      overall_rating: result.overall_rating,
      risk_level: result.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      strengths: result.strengths,
      development_areas: result.development_areas,
      risk_indicators: result.risk_indicators,
      recommendations: result.recommendations,
      kpi_snapshot: result.kpi_snapshot,
      generated_at: result.generated_at,
      valid_until: result.valid_until,
      model_version: result.model_version,
      tokens_used: result.tokens_used,
    }));
  }
}
