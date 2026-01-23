# Database Documentation

## Overview

The Crew Performance Chatbot uses PostgreSQL as its primary database. The schema is designed to support comprehensive crew performance tracking, KPI management, AI-generated summaries, and chat functionality.

## Database Connection

- **Type**: PostgreSQL
- **Connection**: SSL-enabled (for RDS)
- **Pooling**: Connection pool with max 20 connections
- **Timeout**: 30 seconds for queries

## Schema Diagram

```
┌─────────────────┐
│   crew_master   │
│─────────────────│
│ seafarer_id (PK)│
│ crew_code       │
│ seafarer_name   │
│ current_rank    │
│ sailing_status  │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────▼────────────────────────────────────┐
    │         experience_history               │
    │──────────────────────────────────────────│
    │ id (PK)                                 │
    │ seafarer_id (FK)                        │
    │ vessel_name                             │
    │ rank                                    │
    │ sign_on_date                            │
    │ sign_off_date                           │
    └─────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ kpi_definition  │         │   kpi_value     │
│─────────────────│         │─────────────────│
│ kpi_code (PK)   │◄───┐   │ id (PK)         │
│ title           │    │   │ seafarer_id (FK)│
│ description     │    │   │ kpi_code (FK)   │
│ units           │    └───│ value           │
│ parent_code     │         │ calculated_at   │
│ orientation     │         │ valid_from      │
└─────────────────┘         │ valid_to        │
                            └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│ training_cert   │         │performance_event│
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ seafarer_id (FK)│         │ seafarer_id (FK)│
│ course_name     │         │ event_type      │
│ expiry_date     │         │ event_date      │
│ status          │         │ severity        │
└─────────────────┘         └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│   appraisal     │         │   ai_summary    │
│─────────────────│         │─────────────────│
│ id (PK)         │         │ id (PK)         │
│ seafarer_id (FK)│         │ seafarer_id (FK)│
│ vessel_name     │         │ summary_type    │
│ rating          │         │ overall_rating  │
│ scores          │         │ risk_level      │
└─────────────────┘         │ strengths (JSONB)│
                            │ generated_at    │
                            └─────────────────┘

┌─────────────────┐         ┌─────────────────┐
│  chat_session   │         │  chat_message    │
│─────────────────│         │─────────────────│
│ session_id (PK) │         │ id (PK)         │
│ user_id         │         │ session_id (FK) │
│ started_at      │         │ role             │
│ total_messages  │         │ content          │
└─────────────────┘         │ reasoning_steps  │
                            │ data_sources     │
                            └─────────────────┘
```

## Tables

### crew_master

Primary table for crew member information.

**Columns:**
- `seafarer_id` (INTEGER, PK) - Unique seafarer identifier
- `crew_code` (VARCHAR, UNIQUE) - Unique crew code
- `seafarer_name` (VARCHAR) - Full name
- `email_id` (VARCHAR) - Email address
- `current_rank_name` (VARCHAR) - Current rank/title
- `contact_number` (VARCHAR) - Phone number
- `sailing_status` (ENUM: 'atsea', 'onleave') - Current status
- `department_name` (VARCHAR) - Department
- `pod_name` (VARCHAR) - POD assignment
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- Primary key on `seafarer_id`
- Unique index on `crew_code`
- Index on `sailing_status`
- Index on `current_rank_name`

---

### kpi_definition

Master data for KPI definitions.

**Columns:**
- `kpi_code` (VARCHAR, PK) - Unique KPI code (e.g., "CP0005")
- `title` (VARCHAR) - KPI title
- `description` (TEXT) - Detailed description
- `units` (VARCHAR) - Units of measurement
- `parent_code` (VARCHAR, FK) - Parent KPI for hierarchies
- `kpi_orientation` (ENUM: 'p', 'n') - Positive or negative
- `status` (ENUM: 'Active', 'Inactive') - Current status
- `created_at` (TIMESTAMP) - Creation time
- `updated_at` (TIMESTAMP) - Update time

**Indexes:**
- Primary key on `kpi_code`
- Index on `parent_code`
- Index on `status`

**Relationships:**
- Self-referential: `parent_code` → `kpi_code`

---

### kpi_value

Stores calculated KPI values with validity periods.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `kpi_code` (VARCHAR, FK) - Reference to kpi_definition
- `value` (NUMERIC) - Calculated value
- `value_json` (JSONB) - Complex data structure
- `calculated_at` (TIMESTAMP) - Calculation timestamp
- `valid_from` (DATE) - Validity start date
- `valid_to` (DATE, NULLABLE) - Validity end date

**Indexes:**
- Primary key on `id`
- Index on `(seafarer_id, kpi_code, valid_from)`
- Index on `valid_to`
- Index on `calculated_at`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`
- Foreign key to `kpi_definition.kpi_code`

---

### experience_history

Crew experience records across vessels and ranks.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `vessel_name` (VARCHAR) - Vessel name
- `vessel_imo` (VARCHAR) - IMO number
- `vessel_type` (VARCHAR) - Type of vessel
- `rank` (VARCHAR) - Rank during this assignment
- `sign_on_date` (DATE) - Sign-on date
- `sign_off_date` (DATE, NULLABLE) - Sign-off date
- `tenure_months` (INTEGER) - Calculated tenure
- `experience_type` (VARCHAR) - Type of experience
- `details` (JSONB) - Additional details

**Indexes:**
- Primary key on `id`
- Index on `seafarer_id`
- Index on `sign_on_date`
- Index on `vessel_type`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`

---

### training_certification

Training and certification records.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `course_name` (VARCHAR) - Course/certification name
- `certification_type` (VARCHAR) - Type of certification
- `issue_date` (DATE) - Issue date
- `expiry_date` (DATE, NULLABLE) - Expiry date
- `issuing_authority` (VARCHAR) - Issuing authority
- `status` (ENUM: 'valid', 'expiring_soon', 'expired') - Current status
- `details` (JSONB) - Additional details

**Indexes:**
- Primary key on `id`
- Index on `seafarer_id`
- Index on `expiry_date`
- Index on `status`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`

---

### performance_event

Performance events, incidents, inspections, and appraisals.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `event_type` (ENUM: 'failure', 'inspection', 'incident', 'appraisal') - Event type
- `event_date` (DATE) - Event date
- `category` (VARCHAR) - Event category
- `description` (TEXT) - Event description
- `severity` (ENUM: 'critical', 'high', 'medium', 'low', NULL) - Severity level
- `voyage_number` (VARCHAR, NULLABLE) - Voyage identifier
- `vessel_name` (VARCHAR) - Vessel name
- `port` (VARCHAR, NULLABLE) - Port location
- `authority` (VARCHAR, NULLABLE) - Authority involved
- `outcome` (ENUM: 'resolved', 'pending', 'recurrent', NULL) - Event outcome
- `details` (JSONB) - Additional details

**Indexes:**
- Primary key on `id`
- Index on `seafarer_id`
- Index on `event_date`
- Index on `event_type`
- Index on `severity`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`

---

### appraisal

Performance appraisal records.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `vessel_name` (VARCHAR) - Vessel name
- `from_date` (DATE) - Appraisal period start
- `to_date` (DATE) - Appraisal period end
- `appraisal_date` (DATE) - Appraisal date
- `status` (ENUM: 'Initiated', 'Completed', 'Pending') - Status
- `appraiser_name` (VARCHAR, NULLABLE) - Appraiser name
- `rating` (NUMERIC, NULLABLE) - Overall rating
- `leadership_score` (NUMERIC, NULLABLE) - Leadership score
- `management_score` (NUMERIC, NULLABLE) - Management score
- `teamwork_score` (NUMERIC, NULLABLE) - Teamwork score
- `knowledge_score` (NUMERIC, NULLABLE) - Knowledge score
- `feedback_status` (VARCHAR, NULLABLE) - Feedback status
- `remarks` (TEXT, NULLABLE) - Appraiser remarks
- `details` (JSONB) - Additional details

**Indexes:**
- Primary key on `id`
- Index on `seafarer_id`
- Index on `appraisal_date`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`

---

### ai_summary

AI-generated performance summaries.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `seafarer_id` (INTEGER, FK) - Reference to crew_master
- `summary_type` (ENUM: 'performance', 'risk', 'promotion_readiness') - Summary type
- `summary_text` (TEXT) - Summary text
- `overall_rating` (VARCHAR) - Overall rating
- `risk_level` (ENUM: 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') - Risk level
- `strengths` (JSONB) - Array of strengths
- `development_areas` (JSONB) - Array of development areas
- `risk_indicators` (JSONB) - Array of risk indicators
- `recommendations` (JSONB) - Array of recommendations
- `kpi_snapshot` (JSONB) - KPI values at time of generation
- `generated_at` (TIMESTAMP) - Generation timestamp
- `valid_until` (DATE) - Validity end date
- `model_version` (VARCHAR) - AI model version used
- `tokens_used` (INTEGER) - Tokens consumed

**Indexes:**
- Primary key on `id`
- Index on `seafarer_id`
- Index on `generated_at`
- Index on `summary_type`
- Index on `valid_until`

**Relationships:**
- Foreign key to `crew_master.seafarer_id`

**JSONB Structure Examples:**

```json
{
  "strengths": [
    {
      "area": "Technical Competence",
      "evidence": "High KPI scores",
      "kpi_codes": ["CP0005", "CP0006"]
    }
  ],
  "development_areas": [
    {
      "area": "Leadership",
      "evidence": "Lower leadership scores",
      "recommendation": "Attend leadership training",
      "kpi_codes": ["CL0005"]
    }
  ]
}
```

---

### chat_session

Chat session management.

**Columns:**
- `session_id` (UUID, PK) - Unique session identifier
- `user_id` (VARCHAR) - User identifier
- `started_at` (TIMESTAMP) - Session start time
- `ended_at` (TIMESTAMP, NULLABLE) - Session end time
- `total_messages` (INTEGER) - Total message count
- `total_tokens` (INTEGER) - Total tokens used

**Indexes:**
- Primary key on `session_id`
- Index on `user_id`
- Index on `started_at`

---

### chat_message

Individual chat messages.

**Columns:**
- `id` (INTEGER, PK) - Unique identifier
- `session_id` (UUID, FK) - Reference to chat_session
- `role` (ENUM: 'user', 'assistant', 'system') - Message role
- `content` (TEXT) - Message content
- `reasoning_steps` (JSONB, NULLABLE) - AI reasoning steps
- `data_sources` (JSONB, NULLABLE) - Referenced data sources
- `tokens_used` (INTEGER) - Tokens used for this message
- `created_at` (TIMESTAMP) - Message timestamp

**Indexes:**
- Primary key on `id`
- Index on `session_id`
- Index on `created_at`

**Relationships:**
- Foreign key to `chat_session.session_id`

**JSONB Structure Examples:**

```json
{
  "reasoning_steps": [
    "Analyzed KPI values",
    "Identified patterns",
    "Generated response"
  ],
  "data_sources": [
    {
      "kpi": "CP0005",
      "value": 0.92,
      "table": "kpi_value"
    }
  ]
}
```

## Relationships Summary

1. **crew_master** (1) → (N) **experience_history**
2. **crew_master** (1) → (N) **kpi_value**
3. **crew_master** (1) → (N) **training_certification**
4. **crew_master** (1) → (N) **performance_event**
5. **crew_master** (1) → (N) **appraisal**
6. **crew_master** (1) → (N) **ai_summary**
7. **kpi_definition** (1) → (N) **kpi_value**
8. **kpi_definition** (1) → (N) **kpi_definition** (self-referential via parent_code)
9. **chat_session** (1) → (N) **chat_message**

## Query Optimization

### Indexes

All foreign keys and frequently queried columns are indexed for optimal performance.

### Common Query Patterns

1. **Get crew profile**: Join crew_master with all related tables
2. **KPI snapshot**: Get latest kpi_value for each kpi_code
3. **Experience aggregation**: Calculate tenure from experience_history
4. **Summary refresh**: Find summaries older than N days

### Best Practices

1. Use parameterized queries to prevent SQL injection
2. Use connection pooling for efficient resource management
3. Use JSONB for flexible data structures
4. Use indexes for frequently queried columns
5. Use CTEs and window functions for complex aggregations

## Data Types

- **INTEGER**: Numeric IDs and counts
- **VARCHAR**: Text fields with length limits
- **TEXT**: Long text fields
- **DATE**: Date values
- **TIMESTAMP**: Date and time values
- **UUID**: Unique identifiers
- **ENUM**: Predefined value sets
- **JSONB**: Structured JSON data
- **NUMERIC**: Decimal numbers

## Migration Notes

When setting up the database:

1. Create all tables in dependency order
2. Create indexes after table creation
3. Set up foreign key constraints
4. Populate kpi_definition master data
5. Set up initial crew_master records

## Backup and Recovery

- **Backup Strategy**: Regular automated backups (RDS)
- **Point-in-Time Recovery**: Enabled for RDS
- **Retention**: 7 days (configurable)
