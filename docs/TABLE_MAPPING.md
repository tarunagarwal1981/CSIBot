# Table Mapping Documentation

## Overview

The application uses automatic table name mapping to work with the CSI schema. When `DB_SCHEMA=csi` is set in `.env`, all SQL queries are automatically transformed to use the correct table/view names.

## Current Mappings

Based on your database screenshot, the following mappings are configured:

| Expected Table Name | Actual CSI Table/View | Notes |
|---------------------|----------------------|-------|
| `crew_master` | `vw_csi_crew_master` | Crew master data |
| `appraisal` | `vw_csi_appraisals` | Appraisal records |
| `kpi_definition` | `csi_kpi_items` | KPI definitions (may need column mapping) |
| `kpi_value` | `csi_kpi_items` | KPI values (may need column mapping) |
| `experience_history` | `vw_csi_crew_vessel_master` | Experience/vessel assignments |

## Tables Not Yet Mapped

These tables are referenced in the code but were not visible in your screenshot. You may need to:

1. **Create these tables** in your CSI schema, or
2. **Map them to existing tables/views** if they exist with different names

| Expected Table | Status | Action Needed |
|----------------|--------|---------------|
| `training_certification` | Not visible | Map to existing table or create |
| `performance_event` | Not visible | Map to existing table or create |
| `ai_summary` | Not visible | Map to existing table or create |
| `chat_session` | Not visible | Map to existing table or create |
| `chat_message` | Not visible | Map to existing table or create |

## How It Works

1. Set `DB_SCHEMA=csi` in your `.env` file
2. The connection automatically sets PostgreSQL `search_path` to `csi`
3. All SQL queries are automatically transformed using `mapTableNames()`
4. Table names in queries are replaced with their mapped equivalents

## Adding New Mappings

To add a new table mapping, edit `src/config/tableMapping.ts`:

```typescript
export const TABLE_MAPPING: Record<string, string> = {
  // ... existing mappings
  'your_expected_name': 'actual_csi_table_name',
};
```

## Column Mapping

**Important**: If your CSI tables/views have different column names than expected, you'll need to:

1. Check the column structure of your CSI views/tables
2. Update the SQL queries in the repository files to use the correct column names
3. Or create database views that map columns to the expected names

## Next Steps

1. **Verify column names**: Check if `vw_csi_crew_master` has the same columns as expected (`seafarer_id`, `crew_code`, `seafarer_name`, etc.)
2. **Check KPI structure**: Verify if `csi_kpi_items` contains both definitions and values, or if they're separate
3. **Map missing tables**: Identify or create the missing tables (`training_certification`, `performance_event`, etc.)
4. **Test queries**: Run test queries to ensure column names match

## Example: Checking Column Names

```sql
-- Connect to your database and run:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'csi' 
  AND table_name = 'vw_csi_crew_master'
ORDER BY ordinal_position;
```

Repeat for each mapped table/view to verify column compatibility.
