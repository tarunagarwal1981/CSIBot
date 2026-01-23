# API Documentation

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-amplify-app.amplifyapp.com`

## Authentication

Currently, the API uses a simple user ID system. Include `userId` in request body.

**Future**: Will use AWS Cognito JWT tokens in Authorization header.

## Endpoints

### Chat

#### Send Chat Message

**Endpoint:** `POST /chat`

**Description:** Send a message to the chatbot and receive an AI-generated response.

**Request Body:**
```json
{
  "message": "Show me high-risk crew members",
  "sessionId": "optional-session-id",
  "userId": "user123"
}
```

**Response:**
```json
{
  "response": "Based on the current data, here are the high-risk crew members...",
  "sessionId": "uuid-session-id",
  "dataSources": [
    {
      "kpi": "CP0005",
      "value": 0.85,
      "table": "kpi_value"
    }
  ],
  "reasoningSteps": [
    "Analyzed KPI values for all crew members",
    "Identified crew with low voyage success rates",
    "Cross-referenced with recent performance events"
  ],
  "tokensUsed": 1250,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (missing required fields)
- `500` - Internal Server Error

---

### Summary Generation

#### Generate Performance Summary

**Endpoint:** `POST /generate-summary`

**Description:** Generate AI-powered performance summary for crew member(s).

**Request Body:**
```json
{
  "seafarerId": 12345,
  "batchMode": false,
  "refreshDays": 15
}
```

**Batch Mode:**
```json
{
  "batchMode": true,
  "refreshDays": 15
}
```

**Response:**
```json
{
  "message": "Generated summaries for 5 crew members",
  "successCount": 5,
  "failCount": 0,
  "totalProcessed": 5,
  "results": [
    {
      "seafarerId": 12345,
      "success": true,
      "summaryId": 789,
      "tokensUsed": 3500,
      "changes": {
        "riskLevelChange": false,
        "newRisks": [],
        "resolvedRisks": [],
        "trendChange": true
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (must provide seafarerId or batchMode)
- `500` - Internal Server Error

---

### KPI Calculation

#### Calculate KPIs

**Endpoint:** `POST /calculate-kpis`

**Description:** Calculate KPIs for a crew member. Can calculate specific KPIs or all KPIs.

**Request Body:**
```json
{
  "seafarerId": 12345,
  "kpiCodes": ["CP0005", "CP0006"],
  "saveToDB": false
}
```

**Calculate All KPIs:**
```json
{
  "seafarerId": 12345,
  "saveToDB": true
}
```

**Response:**
```json
{
  "seafarerId": 12345,
  "kpis": {
    "CP0005": {
      "value": 0.92,
      "calculated_at": "2024-01-15T10:30:00Z",
      "unit": "percentage"
    },
    "CP0006": {
      "value": 45,
      "calculated_at": "2024-01-15T10:30:00Z",
      "unit": "days"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "savedToDB": false
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (seafarerId required)
- `500` - Internal Server Error

---

### Crew Management

#### Search Crew Members

**Endpoint:** `POST /crew/search`

**Description:** Search for crew members by name, code, or email.

**Request Body:**
```json
{
  "query": "John Doe",
  "limit": 50
}
```

**Response:**
```json
{
  "results": [
    {
      "seafarer_id": 12345,
      "crew_code": "CD001",
      "seafarer_name": "John Doe",
      "current_rank_name": "Chief Engineer",
      "sailing_status": "atsea",
      "department_name": "Engineering",
      "email_id": "john.doe@example.com"
    }
  ],
  "total": 1,
  "limit": 50
}
```

---

#### Get Crew Member by ID

**Endpoint:** `GET /crew/:id`

**Description:** Get detailed information about a specific crew member.

**Response:**
```json
{
  "seafarer_id": 12345,
  "crew_code": "CD001",
  "seafarer_name": "John Doe",
  "current_rank_name": "Chief Engineer",
  "sailing_status": "atsea",
  "department_name": "Engineering",
  "pod_name": "Pod A",
  "email_id": "john.doe@example.com",
  "contact_number": "+1234567890",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

#### Get Complete Crew Profile

**Endpoint:** `GET /crew/:id/profile`

**Description:** Get complete crew profile including KPIs, experience, certifications, events, and summaries.

**Response:**
```json
{
  "master": {
    "seafarer_id": 12345,
    "crew_code": "CD001",
    "seafarer_name": "John Doe",
    ...
  },
  "kpis": {
    "CP0005": 0.92,
    "CP0006": 45,
    ...
  },
  "experience": [
    {
      "id": 1,
      "vessel_name": "MV Example",
      "rank": "Chief Engineer",
      "sign_on_date": "2023-01-01",
      "sign_off_date": "2023-06-30",
      "tenure_months": 6
    }
  ],
  "certifications": [
    {
      "id": 1,
      "course_name": "STCW Basic Safety",
      "status": "valid",
      "expiry_date": "2025-12-31"
    }
  ],
  "recentEvents": [],
  "latestAppraisal": null,
  "latestSummary": {
    "id": 789,
    "overall_rating": "Good",
    "risk_level": "LOW",
    ...
  }
}
```

---

### KPI Management

#### Get KPI Definitions

**Endpoint:** `GET /kpis/definitions`

**Description:** Get all active KPI definitions.

**Response:**
```json
[
  {
    "kpi_code": "CP0005",
    "title": "Voyage Success Rate",
    "description": "Percentage of successful voyages",
    "units": "percentage",
    "kpi_orientation": "p",
    "status": "Active"
  }
]
```

---

#### Get KPI Benchmark

**Endpoint:** `GET /kpis/:code/benchmark`

**Description:** Get benchmark values (fleet average, median, percentiles) for a KPI.

**Query Parameters:**
- `rank` (optional): Filter by rank

**Response:**
```json
{
  "average": 0.85,
  "median": 0.87,
  "p75": 0.92,
  "p90": 0.95
}
```

---

### Health Check

#### Health Check

**Endpoint:** `GET /health`

**Description:** Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Missing required fields: message, userId"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error details (only in development mode)"
}
```

## Rate Limiting

- **Max Tokens per Request**: 4000 (configurable)
- **Max Requests per Minute**: 20 (configurable)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## CORS

CORS is enabled for all endpoints:
- **Allowed Origins**: `*` (configurable)
- **Allowed Methods**: `GET, POST, OPTIONS`
- **Allowed Headers**: `Content-Type, Authorization`

## Date Formats

All dates are in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`

Example: `2024-01-15T10:30:00Z`
