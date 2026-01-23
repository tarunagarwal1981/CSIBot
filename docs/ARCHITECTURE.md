# System Architecture Documentation

## Architecture Overview

The Crew Performance Chatbot is a full-stack application built on AWS Amplify Gen 2, featuring a React frontend and serverless Lambda backend functions. The system integrates with PostgreSQL for data storage and Anthropic's Claude AI for intelligent analysis.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React App  │  │  Components  │  │  Custom Hooks │     │
│  │  (TypeScript)│  │  (Tailwind)  │  │   (React)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │   API Service  │                        │
│                    │   (REST API)   │                        │
│                    └───────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    AWS Amplify Gen 2                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Gateway                              │   │
│  └──────────────────────────────────────────────────────┘   │
│         │              │              │                      │
│  ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐            │
│  │ Chat Lambda  │ │ Summary    │ │ KPI Calc   │            │
│  │  Function    │ │ Lambda     │ │ Lambda     │            │
│  └──────┬──────┘ └─────┬──────┘ └─────┬──────┘            │
│         │               │               │                    │
│         └───────────────┼───────────────┘                    │
│                         │                                     │
│              ┌──────────▼──────────┐                          │
│              │  Service Layer     │                          │
│              │  - AI Orchestrator │                          │
│              │  - Claude Client   │                          │
│              │  - Repositories    │                          │
│              └──────────┬──────────┘                          │
└─────────────────────────┼─────────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│                    External Services                           │
│  ┌──────────────────┐         ┌──────────────────┐           │
│  │   PostgreSQL     │         │  Anthropic API   │           │
│  │   (RDS)         │         │  (Claude AI)    │           │
│  └──────────────────┘         └──────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

**Core Components:**
- `ChatInterface` - Main chat UI
- `MessageBubble` - Individual message display
- `KPICard` - KPI visualization
- `CrewCard` - Crew member display
- `ErrorBoundary` - Error handling
- `LoadingSpinner` - Loading states

**Custom Hooks:**
- `useChat` - Chat functionality
- `useKPI` - KPI data fetching
- `useCrewSearch` - Crew search

**Services:**
- `API` - Centralized API client
- `Environment` - Configuration management

### Backend Architecture

**Lambda Functions:**

1. **Chat Function** (`amplify/functions/chat/`)
   - Handles user chat queries
   - Manages chat sessions
   - Integrates with AI orchestrator
   - Returns AI-generated responses

2. **Generate Summary Function** (`amplify/functions/generate-summary/`)
   - Scheduled daily at 2 AM UTC
   - Generates performance summaries
   - Batch processing support
   - Change detection

3. **Calculate KPIs Function** (`amplify/functions/calculate-kpis/`)
   - On-demand KPI calculations
   - Derived KPI computation
   - Batch processing
   - Optional database persistence

**Service Layer:**

1. **AI Services** (`src/services/ai/`)
   - `claudeClient.ts` - Claude API wrapper
   - `orchestrator.ts` - AI operation coordination
   - `prompts.ts` - Prompt templates

2. **Database Services** (`src/services/database/`)
   - `connection.ts` - PostgreSQL connection pool
   - `repositories/` - Data access layer
     - `kpiRepository.ts`
     - `crewRepository.ts`
     - `experienceRepository.ts`
     - `trainingRepository.ts`
     - `performanceRepository.ts`
     - `summaryRepository.ts`
     - `chatRepository.ts`

## Data Flow

### Chat Query Flow

```
User Input → ChatInterface → API.sendChatMessage()
    ↓
API Gateway → Chat Lambda Function
    ↓
ChatRepository (get/create session)
    ↓
AIOrchestrator.handleChatQuery()
    ↓
├─→ Gather Crew Data (if needed)
├─→ Build Prompt
├─→ ClaudeClient.complete()
└─→ Parse Response
    ↓
ChatRepository.saveMessage()
    ↓
Return Response → Frontend
```

### Summary Generation Flow

```
EventBridge Trigger (Daily 2 AM UTC)
    ↓
Generate Summary Lambda
    ↓
CrewRepository.getCrewNeedingSummaryRefresh()
    ↓
For each crew member:
    ├─→ Gather all data
    ├─→ Build performance prompt
    ├─→ ClaudeClient.completeJSON()
    ├─→ Parse summary
    └─→ SummaryRepository.saveSummary()
    ↓
Compare with previous summary
    ↓
Return results
```

### KPI Calculation Flow

```
User Request → Calculate KPIs Lambda
    ↓
Determine KPI codes to calculate
    ↓
For each KPI:
    ├─→ Route to appropriate repository
    ├─→ Execute calculation
    └─→ Optionally save to database
    ↓
Return calculated KPIs
```

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **React Markdown** - Markdown rendering

### Backend
- **AWS Amplify Gen 2** - Backend framework
- **AWS Lambda** - Serverless functions
- **API Gateway** - REST API
- **EventBridge** - Scheduled tasks
- **TypeScript** - Type safety

### Database
- **PostgreSQL** - Relational database
- **pg** (node-postgres) - Database driver
- **Connection Pooling** - Efficient connections

### AI/ML
- **Anthropic Claude API** - AI service
- **Claude 3.5 Sonnet** - Model version

## Security Architecture

### Authentication
- Currently: Simple user ID (localStorage)
- Future: AWS Cognito integration
- Session management via UUID

### Data Security
- Environment variables for secrets
- SSL database connections
- Parameterized SQL queries (SQL injection prevention)
- CORS configuration

### API Security
- API Gateway authentication (future)
- Rate limiting
- Input validation
- Error handling without exposing internals

## Scalability Considerations

### Horizontal Scaling
- Lambda functions auto-scale
- Stateless design
- Connection pooling for database

### Performance Optimization
- Database connection pooling
- Query optimization (indexes, CTEs)
- Caching strategies (future)
- Batch processing for summaries

### Cost Optimization
- Serverless architecture (pay per use)
- Efficient database queries
- Token usage tracking
- Rate limiting

## Monitoring & Observability

### Logging
- CloudWatch Logs for Lambda functions
- Console logging for debugging
- Error tracking

### Metrics
- Lambda invocation counts
- Duration metrics
- Error rates
- Token usage tracking

### Alerts
- Error rate thresholds
- Function timeout alerts
- Database connection failures

## Future Enhancements

1. **Real-time Updates** - WebSocket support
2. **Caching Layer** - Redis integration
3. **Advanced Analytics** - Data warehouse integration
4. **Mobile App** - React Native
5. **Multi-tenancy** - Organization support
6. **Advanced Auth** - OAuth, SSO
7. **Audit Logging** - Comprehensive audit trail
