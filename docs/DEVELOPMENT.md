# Development Guide

## Local Development Setup

This guide covers setting up the Crew Performance Chatbot for local development.

## Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn**
- **PostgreSQL** (local or remote)
- **Git**
- **VS Code** or preferred IDE
- **Anthropic API Key** (for AI features)

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd crew-performance-chatbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Environment File

```bash
npm run generate-env
```

Or manually create `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crew_performance
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=false

ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

NODE_ENV=development
API_URL=http://localhost:3000
```

### 4. Set Up Database

**Option A: Local PostgreSQL**

```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql

# Windows
# Download from postgresql.org

# Create database
createdb crew_performance

# Run migrations (if available)
psql crew_performance < migrations/schema.sql
```

**Option B: Remote Database**

Update `.env` with remote database credentials.

### 5. Configure AWS Amplify

```bash
npx ampx configure
```

Select:
- AWS profile
- Region
- App name

## Running the Application

### Development Server

Start the frontend development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or port shown in terminal).

### Amplify Sandbox

Start the backend sandbox environment:

```bash
npm run sandbox
```

This starts:
- Lambda functions locally
- API Gateway endpoints
- Local development environment

**Note**: Keep sandbox running in a separate terminal while developing.

### Full Stack Development

**Terminal 1 - Backend:**
```bash
npm run sandbox
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Test locally
npm run dev
npm run sandbox

# Commit changes
git add .
git commit -m "Add feature X"

# Push and create PR
git push origin feature/my-feature
```

### 2. Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### 3. Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format code
npm run format
```

### 4. Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
crew-performance-chatbot/
├── amplify/                    # Backend configuration
│   ├── backend.ts             # Main backend config
│   ├── auth/                  # Auth resources
│   ├── data/                  # Data models
│   └── functions/             # Lambda functions
│       ├── chat/
│       ├── generate-summary/
│       └── calculate-kpis/
├── src/                       # Frontend source
│   ├── components/            # React components
│   ├── hooks/                 # Custom hooks
│   ├── services/              # API & business logic
│   ├── types/                 # TypeScript types
│   └── config/                # Configuration
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
└── public/                    # Static assets
```

## Code Organization

### Components

- **Location**: `src/components/`
- **Naming**: PascalCase (e.g., `ChatInterface.tsx`)
- **Structure**: One component per file
- **Props**: Typed with TypeScript interfaces

### Hooks

- **Location**: `src/hooks/`
- **Naming**: camelCase with `use` prefix (e.g., `useChat.ts`)
- **Pattern**: Custom hooks for reusable logic

### Services

- **Location**: `src/services/`
- **Structure**:
  - `api.ts` - API client
  - `ai/` - AI services
  - `database/` - Database repositories

### Types

- **Location**: `src/types/`
- **Naming**: PascalCase (e.g., `database.ts`)
- **Exports**: Named exports for types

## Development Tools

### VS Code Extensions

Recommended extensions:

- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Tailwind CSS IntelliSense** - Tailwind support
- **GitLens** - Git integration

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Debugging

### Frontend Debugging

1. **Browser DevTools**
   - React DevTools extension
   - Network tab for API calls
   - Console for errors

2. **VS Code Debugging**
   - Create `.vscode/launch.json`:
   ```json
   {
     "type": "chrome",
     "request": "launch",
     "name": "Launch Chrome",
     "url": "http://localhost:5173",
     "webRoot": "${workspaceFolder}/src"
   }
   ```

### Backend Debugging

1. **Lambda Logs**
   ```bash
   # View logs in terminal (sandbox mode)
   # Logs appear in sandbox output
   ```

2. **CloudWatch Logs** (deployed)
   ```bash
   aws logs tail /aws/lambda/chat-function --follow
   ```

3. **Console Logging**
   - Use `console.log()` for debugging
   - Logs appear in sandbox output

## Database Development

### Local Database Setup

```bash
# Start PostgreSQL
# macOS
brew services start postgresql

# Ubuntu
sudo service postgresql start

# Connect to database
psql crew_performance

# Run queries
SELECT * FROM crew_master LIMIT 10;
```

### Database Migrations

Create migration files in `migrations/`:

```sql
-- migrations/001_create_tables.sql
CREATE TABLE crew_master (
  seafarer_id SERIAL PRIMARY KEY,
  crew_code VARCHAR(50) UNIQUE NOT NULL,
  -- ...
);
```

Run migrations:
```bash
psql crew_performance < migrations/001_create_tables.sql
```

### Seed Data

Create seed files in `migrations/seeds/`:

```sql
-- migrations/seeds/001_seed_crew.sql
INSERT INTO crew_master (crew_code, seafarer_name, ...)
VALUES ('CD001', 'John Doe', ...);
```

## API Development

### Testing API Endpoints

**Using curl:**
```bash
# Chat endpoint
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","userId":"test123"}'

# Health check
curl http://localhost:3000/health
```

**Using Postman:**
1. Import collection (if available)
2. Set base URL: `http://localhost:3000`
3. Test endpoints

**Using VS Code REST Client:**
Create `api.http`:
```http
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "test",
  "userId": "test123"
}
```

## Common Development Tasks

### Adding a New Component

```bash
# Create component file
touch src/components/MyComponent.tsx

# Add to component
export function MyComponent() {
  return <div>My Component</div>;
}

# Import and use
import { MyComponent } from './components/MyComponent';
```

### Adding a New API Endpoint

1. **Create Lambda Function**
   ```bash
   mkdir amplify/functions/my-endpoint
   touch amplify/functions/my-endpoint/handler.ts
   touch amplify/functions/my-endpoint/resource.ts
   ```

2. **Add to Backend**
   ```typescript
   // amplify/backend.ts
   import { myEndpoint } from './functions/my-endpoint/resource';
   
   export const backend = defineBackend({
     // ...
     myEndpoint,
   });
   ```

3. **Add to API Service**
   ```typescript
   // src/services/api.ts
   static async myEndpoint(data: any) {
     return apiCall(`${API_BASE_URL}/my-endpoint`, {
       method: 'POST',
       body: JSON.stringify(data),
     });
   }
   ```

### Adding a New Hook

```typescript
// src/hooks/useMyHook.ts
export function useMyHook() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Fetch data
  }, []);
  
  return { data };
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Database Connection Issues

1. Check PostgreSQL is running
2. Verify credentials in `.env`
3. Check firewall settings
4. Test connection:
   ```bash
   psql -h localhost -U postgres -d crew_performance
   ```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check TypeScript config
npx tsc --noEmit

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Amplify Sandbox Issues

```bash
# Clear Amplify cache
rm -rf amplify_outputs.json
npx ampx sandbox --once

# Check AWS credentials
aws sts get-caller-identity
```

## Best Practices

### Code Style

1. **TypeScript**
   - Use strict mode
   - Type all functions
   - Avoid `any` type

2. **React**
   - Use functional components
   - Use hooks for state
   - Extract reusable logic

3. **Naming**
   - Components: PascalCase
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
   - Files: match export name

### Git Workflow

1. **Branches**
   - `main` - Production
   - `dev` - Development
   - `feature/*` - Features
   - `fix/*` - Bug fixes

2. **Commits**
   - Use conventional commits
   - Write clear messages
   - Keep commits focused

3. **Pull Requests**
   - Write descriptive PRs
   - Link related issues
   - Request reviews

### Testing

1. **Unit Tests**
   - Test utilities and helpers
   - Test hooks in isolation
   - Mock external dependencies

2. **Integration Tests**
   - Test API endpoints
   - Test component interactions
   - Test database operations

3. **E2E Tests** (Future)
   - Test user flows
   - Test critical paths

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

## Getting Help

1. Check documentation in `docs/`
2. Search existing issues
3. Ask in team chat
4. Create new issue with details
