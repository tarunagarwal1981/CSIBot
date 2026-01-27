import { isValidColumn, getKPICodeFromColumn, ALL_KPI_COLUMNS } from '../config/kpiColumnMapping';

/**
 * Validate KPI column names before executing queries
 */
export function validateKPIColumns(columns: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const column of columns) {
    if (!isValidColumn(column)) {
      errors.push(`Invalid column name: ${column}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Log column validation errors
 */
export function logColumnValidationErrors(errors: string[]): void {
  if (errors.length > 0) {
    console.error('❌ Column validation errors:');
    errors.forEach(error => console.error(`   - ${error}`));
  }
}

/**
 * Safe column name getter with fallback
 */
export function getSafeColumnName(kpiCode: string, fallback: string = 'unknown'): string {
  const mapping = ALL_KPI_COLUMNS[kpiCode];
  return mapping?.valueColumn || fallback;
}
