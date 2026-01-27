/**
 * KPI Column Mapping Configuration
 * Single source of truth for all KPI-related column names
 * Maps KPI codes to their actual database column names
 */

export interface KPIColumnMapping {
  view: 'vw_csi_competency' | 'vw_csi_capability' | 'vw_csi_character' | 'vw_csi_collaboration';
  valueColumn: string;
  jsonColumn: string;
  kpiCode: string;
  category: string;
  description: string;
}

/**
 * Complete mapping for vw_csi_competency (CO - Competency/Experience KPIs)
 */
export const COMPETENCY_COLUMNS: Record<string, KPIColumnMapping> = {
  'CO0001': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0001',
    valueColumn: 'work_experience_with_synergy',
    jsonColumn: 'json_work_experience_with_synergy',
    category: 'Experience',
    description: 'Work experience with Synergy'
  },
  'CO0002': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0002',
    valueColumn: 'current_rank_experience',
    jsonColumn: 'json_current_rank_experience',
    category: 'Experience',
    description: 'Current rank experience'
  },
  'CO0003': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0003',
    valueColumn: 'time_in_current_ship_type',
    jsonColumn: 'json_time_in_current_ship_type',
    category: 'Experience',
    description: 'Time in current ship type'
  },
  'CO0004': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0004',
    valueColumn: 'serving_on_ota_ship_in_last_5_years',
    jsonColumn: 'json_serving_on_ota_ship_in_last_5_years',
    category: 'Experience',
    description: 'Serving on OTA ship in last 5 years'
  },
  'CO0005': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0005',
    valueColumn: 'vessel_takeover__new',  // DOUBLE UNDERSCORE
    jsonColumn: 'json_vessel_takeover__new',
    category: 'Experience',
    description: 'New vessel takeover experience'
  },
  'CO0006': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0006',
    valueColumn: 'vessel_takeover__second_hand',  // DOUBLE UNDERSCORE
    jsonColumn: 'json_vessel_takeover__second_hand',
    category: 'Experience',
    description: 'Second-hand vessel takeover experience'
  },
  'CO0007': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0007',
    valueColumn: 'onboard_training_and_courses',
    jsonColumn: 'json_onboard_training_and_courses',
    category: 'Training',
    description: 'Onboard training and courses'
  },
  'CO0008': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0008',
    valueColumn: 'dry_dock_experience',
    jsonColumn: 'json_dry_dock_experience',
    category: 'Experience',
    description: 'Dry dock experience'
  },
  'CO0009': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0009',
    valueColumn: 'cbt_score',
    jsonColumn: 'json_cbt_score',
    category: 'Assessment',
    description: 'CBT score'
  },
  'CO0010': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0010',
    valueColumn: 'training_matrix_course',
    jsonColumn: 'json_training_matrix_course',
    category: 'Training',
    description: 'Training matrix course count'
  },
  'CO0011': {
    view: 'vw_csi_competency',
    kpiCode: 'CO0011',
    valueColumn: 'superior_certificate',
    jsonColumn: 'json_superior_certificate',
    category: 'Certification',
    description: 'Superior certificate status'
  },
};

/**
 * Complete mapping for vw_csi_capability (CP - Performance/Capability KPIs)
 */
export const CAPABILITY_COLUMNS: Record<string, KPIColumnMapping> = {
  'CP0001': {
    view: 'vw_csi_capability',
    kpiCode: 'CP0001',
    valueColumn: 'successful_voyage_performance',
    jsonColumn: 'json_successful_voyage_performance',
    category: 'Performance',
    description: 'Successful voyage performance'
  },
  'CP0002': {
    view: 'vw_csi_capability',
    kpiCode: 'CP0002',
    valueColumn: 'no_of_days_since_last_failure',
    jsonColumn: 'json_no_of_days_since_last_failure',
    category: 'Performance',
    description: 'Days since last failure'
  },
  'CP0003': {
    view: 'vw_csi_capability',
    kpiCode: 'CP0003',
    valueColumn: 'average_appraisal_score',
    jsonColumn: 'json_average_appraisal_score',
    category: 'Assessment',
    description: 'Average appraisal score'
  },
  'CP0004': {
    view: 'vw_csi_capability',
    kpiCode: 'CP0004',
    valueColumn: 'psychometric_score',
    jsonColumn: 'json_psychometric_score',
    category: 'Assessment',
    description: 'Psychometric score'
  },
  'CP0005': {
    view: 'vw_csi_capability',
    kpiCode: 'CP0005',
    valueColumn: 'sign_off_due_to_medical_reason_3_years',
    jsonColumn: 'json_sign_off_due_to_medical_reason_3_years',
    category: 'Medical',
    description: 'Sign-off due to medical reasons (3 years)'
  },
};

/**
 * Complete mapping for vw_csi_character (CH - Character/Behavioral KPIs)
 */
export const CHARACTER_COLUMNS: Record<string, KPIColumnMapping> = {
  'CH0001': {
    view: 'vw_csi_character',
    kpiCode: 'CH0001',
    valueColumn: 'successful_contract',
    jsonColumn: 'json_successful_contract',
    category: 'Contract',
    description: 'Successful contract completion'
  },
  'CH0002': {
    view: 'vw_csi_character',
    kpiCode: 'CH0002',
    valueColumn: 'offhires_days_last_3_years',  // ✅ Single underscores
    jsonColumn: 'json_offhires_days_last_3_years',  // ✅ Single underscores
    category: 'Contract',
    description: 'Off-hire days in last 3 years'
  },
  'CH0003': {
    view: 'vw_csi_character',
    kpiCode: 'CH0003',
    valueColumn: 'sign_on_delays__crew',  // ✅ DOUBLE underscore between delays and crew
    jsonColumn: 'json_sign_on_delays__crew',  // ✅ DOUBLE underscore between delays and crew
    category: 'Contract',
    description: 'Sign-on delays'
  },
  'CH0004': {
    view: 'vw_csi_character',
    kpiCode: 'CH0004',
    valueColumn: 'leadership',
    jsonColumn: 'json_leadership',
    category: 'Behavioral',
    description: 'Leadership score'
  },
  'CH0005': {
    view: 'vw_csi_character',
    kpiCode: 'CH0005',
    valueColumn: 'management',
    jsonColumn: 'json_management',
    category: 'Behavioral',
    description: 'Management score'
  },
  'CH0006': {
    view: 'vw_csi_character',
    kpiCode: 'CH0006',
    valueColumn: 'team_work',
    jsonColumn: 'json_team_work',
    category: 'Behavioral',
    description: 'Teamwork score'
  },
  'CH0007': {
    view: 'vw_csi_character',
    kpiCode: 'CH0007',
    valueColumn: 'knowledge',
    jsonColumn: 'json_knowledge',
    category: 'Behavioral',
    description: 'Knowledge score'
  },
};

/**
 * Complete mapping for vw_csi_collaboration (CL - Collaboration/Compliance KPIs)
 */
export const COLLABORATION_COLUMNS: Record<string, KPIColumnMapping> = {
  'CL0001': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0001',
    valueColumn: 'negative_inspections_3_years',
    jsonColumn: 'json_negative_inspections_3_years',
    category: 'Inspection',
    description: 'Negative inspections (3 years)'
  },
  'CL0002': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0002',
    valueColumn: 'no_of_detentions_3_years',
    jsonColumn: 'json_no_of_detentions_3_years',
    category: 'Inspection',
    description: 'Number of detentions (3 years)'
  },
  'CL0003': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0003',
    valueColumn: 'positive_inspections_3_years',
    jsonColumn: 'json_positive_inspections_3_years',
    category: 'Inspection',
    description: 'Positive inspections (3 years)'
  },
  'CL0004': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0004',
    valueColumn: 'vetting_awards_3_years',
    jsonColumn: 'json_vetting_awards_3_years',
    category: 'Recognition',
    description: 'Vetting awards (3 years)'
  },
  'CL0005': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0005',
    valueColumn: 'major_incidents_in_last_3_years',
    jsonColumn: 'json_major_incidents_in_last_3_years',
    category: 'Incident',
    description: 'Major incidents (3 years)'
  },
  'CL0006': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0006',
    valueColumn: 'shore_communication',
    jsonColumn: 'json_shore_communication',
    category: 'Communication',
    description: 'Shore communication score'
  },
  'CL0007': {
    view: 'vw_csi_collaboration',
    kpiCode: 'CL0007',
    valueColumn: 'ship_communication',
    jsonColumn: 'json_ship_communication',
    category: 'Communication',
    description: 'Ship communication score'
  },
};

/**
 * Combined mapping of all KPIs
 */
export const ALL_KPI_COLUMNS: Record<string, KPIColumnMapping> = {
  ...COMPETENCY_COLUMNS,
  ...CAPABILITY_COLUMNS,
  ...CHARACTER_COLUMNS,
  ...COLLABORATION_COLUMNS,
};

/**
 * Get column mapping for a specific KPI code
 */
export function getKPIColumnMapping(kpiCode: string): KPIColumnMapping | null {
  return ALL_KPI_COLUMNS[kpiCode] || null;
}

/**
 * Get all KPI codes for a specific view
 */
export function getKPICodesForView(viewName: string): string[] {
  return Object.values(ALL_KPI_COLUMNS)
    .filter(mapping => mapping.view === viewName)
    .map(mapping => mapping.kpiCode);
}

/**
 * Get all column names for a specific view
 */
export function getColumnsForView(viewName: string): string[] {
  return Object.values(ALL_KPI_COLUMNS)
    .filter(mapping => mapping.view === viewName)
    .map(mapping => mapping.valueColumn);
}

/**
 * Validate that a column exists in the mapping
 */
export function isValidColumn(columnName: string): boolean {
  return Object.values(ALL_KPI_COLUMNS).some(
    mapping => mapping.valueColumn === columnName || mapping.jsonColumn === columnName
  );
}

/**
 * Get KPI code from column name
 */
export function getKPICodeFromColumn(columnName: string): string | null {
  const mapping = Object.values(ALL_KPI_COLUMNS).find(
    m => m.valueColumn === columnName || m.jsonColumn === columnName
  );
  return mapping?.kpiCode || null;
}
