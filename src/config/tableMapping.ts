/**
 * Database Table Mapping Configuration
 * Maps expected table names to actual table/view names in the CSI schema
 * @module config/tableMapping
 */

/**
 * Table name mappings for CSI schema
 * Expected name -> Actual name in CSI schema
 */
export const TABLE_MAPPING: Record<string, string> = {
  // Crew master data
  'crew_master': 'vw_csi_crew_master',
  
  // KPI data
  'kpi_definition': 'csi_kpi_items',  // May need to verify structure
  'kpi_value': 'csi_kpi_items',       // May need to verify structure
  
  // Appraisals
  'appraisal': 'vw_csi_appraisals',
  
  // Experience/Vessel assignments
  'experience_history': 'vw_csi_crew_vessel_master',  // May need to verify
  
  // Competency/Performance views (may map to KPI or separate tables)
  'vw_csi_capability': 'vw_csi_capability',
  'vw_csi_character': 'vw_csi_character',
  'vw_csi_collaboration': 'vw_csi_collaboration',
  'vw_csi_competency': 'vw_csi_competency',
  
  // Note: These tables may not exist yet - will need to create or map:
  // 'training_certification': '...',  // Not visible in screenshot
  // 'performance_event': '...',        // Not visible in screenshot
  // 'ai_summary': '...',               // Not visible in screenshot
  // 'chat_session': '...',             // Not visible in screenshot
  // 'chat_message': '...',             // Not visible in screenshot
};

/**
 * Gets the actual table name for a given expected table name
 * @param expectedName Expected table name from codebase
 * @returns Actual table/view name in CSI schema, or original if no mapping
 */
export function getTableName(expectedName: string): string {
  return TABLE_MAPPING[expectedName] || expectedName;
}

/**
 * Gets the actual table name with schema prefix
 * @param expectedName Expected table name from codebase
 * @param schema Schema name (default: 'csi')
 * @returns Schema-qualified table name
 */
export function getQualifiedTableName(expectedName: string, schema: string = 'csi'): string {
  const tableName = getTableName(expectedName);
  return `${schema}.${tableName}`;
}

/**
 * Replaces table names in SQL query with mapped names
 * Uses word boundaries to avoid partial replacements
 * @param sql SQL query string
 * @returns SQL with table names replaced
 */
export function mapTableNames(sql: string): string {
  let mappedSql = sql;
  
  // Replace table names (using word boundaries to avoid partial matches)
  for (const [expected, actual] of Object.entries(TABLE_MAPPING)) {
    // Match table names in FROM, JOIN, INTO, UPDATE clauses
    // Use word boundaries and case-insensitive matching
    const regex = new RegExp(`\\b${expected}\\b`, 'gi');
    mappedSql = mappedSql.replace(regex, actual);
  }
  
  return mappedSql;
}
