# Crew Performance Chatbot

A modern AI-powered chatbot application for analyzing and managing crew performance data using AWS Amplify Gen 2, React, TypeScript, and Anthropic's Claude AI.

## 🚀 Features

- **AI-Powered Chat Interface**: Natural language queries about crew performance
- **KPI Analysis**: Real-time calculation and visualization of Key Performance Indicators
- **Performance Summaries**: Automated AI-generated performance summaries
- **Risk Detection**: Identify at-risk crew members proactively
- **Training Tracking**: Monitor certifications and training requirements
- **Experience Analysis**: Track crew experience across vessels and ranks
- **Modern UI**: Responsive design with dark mode support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **AWS Account** with appropriate permissions
- **PostgreSQL Database** (RDS or local)
- **Anthropic API Key** for Claude AI

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crew-performance-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   npm run generate-env
   ```
   
   Or manually create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure AWS Amplify**
   ```bash
   npx ampx configure
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=crew_performance
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=true
DB_SCHEMA=public

# Claude API Configuration
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Application Configuration
NODE_ENV=development
API_URL=http://localhost:3000

# Frontend: backend API URL (set to sandbox API URL when running locally)
VITE_API_URL=http://localhost:20002

# Feature Flags
ENABLE_SUMMARY_GENERATION=true
ENABLE_RISK_DETECTION=true
SUMMARY_REFRESH_DAYS=15

# Rate Limiting
MAX_TOKENS_PER_REQUEST=4000
MAX_REQUESTS_PER_MINUTE=20
```

**Local testing:** For where to set RDS, `VITE_API_URL`, and how table names work, see **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)**.

### Database Setup

1. **Create PostgreSQL Database**
   - Set up an RDS PostgreSQL instance or use a local PostgreSQL database
   - Create the database schema using the provided SQL scripts (if available)

2. **Configure Connection**
   - Update `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `.env`
   - Ensure SSL is enabled for RDS connections

### AWS Amplify Configuration

1. **Initialize Amplify Backend**
   ```bash
   npx ampx sandbox
   ```

2. **Configure Functions**
   - Ensure all Lambda functions have access to environment variables
   - Set up IAM roles and permissions for database access

## 🚀 Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in terminal).

### Run Amplify Sandbox

For local backend development:

```bash
npm run sandbox
```

This starts the Amplify sandbox environment for testing Lambda functions locally.

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 📦 Deployment

### Deploy to Development Environment

```bash
npm run deploy:dev
```

This deploys to the `dev` branch using Amplify pipelines.

### Deploy to Production

```bash
npm run deploy:prod
```

This deploys to the `main` branch using Amplify pipelines.

### Manual Deployment

1. **Push to Git Repository**
   ```bash
   git push origin main
   ```

2. **Amplify will automatically deploy** if CI/CD is configured

## 🧪 Testing

Run tests:

```bash
npm test
```

Run linting:

```bash
npm run lint
```

Format code:

```bash
npm run format
```

## 📁 Project Structure

```
crew-performance-chatbot/
├── amplify/                 # AWS Amplify backend
│   ├── backend.ts          # Main backend configuration
│   ├── auth/               # Authentication resources
│   ├── data/               # Data models
│   └── functions/          # Lambda functions
│       ├── chat/           # Chat endpoint
│       ├── generate-summary/ # Summary generation
│       └── calculate-kpis/  # KPI calculations
├── src/                    # Frontend source code
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and business logic
│   ├── types/              # TypeScript type definitions
│   └── config/             # Configuration files
├── scripts/                # Utility scripts
└── public/                 # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run sandbox` - Start Amplify sandbox
- `npm run deploy:dev` - Deploy to development
- `npm run deploy:prod` - Deploy to production
- `npm run generate-env` - Generate .env file interactively
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture](docs/ARCHITECTURE.md)** - System architecture and design
- **[API Documentation](docs/API.md)** - Complete API endpoint reference
- **[Database Schema](docs/DATABASE.md)** - Database structure and relationships
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deployment instructions and best practices
- **[Development Guide](docs/DEVELOPMENT.md)** - Local development setup and workflows

## 🗄️ Database Schema

- `crew_master` - Crew member information
- `kpi_definition` - KPI definitions
- `kpi_value` - KPI values and history
- `experience_history` - Crew experience records
- `training_certification` - Training and certifications
- `performance_event` - Performance events and incidents
- `appraisal` - Performance appraisals
- `ai_summary` - AI-generated summaries
- `chat_session` - Chat session management
- `chat_message` - Chat message history

## 🔐 Security

- **Environment Variables**: Never commit `.env` files to version control
- **API Keys**: Store sensitive keys in AWS Secrets Manager or environment variables
- **Database**: Use SSL connections and strong passwords
- **CORS**: Configure appropriate CORS policies for production
- **Authentication**: Enable Amplify Auth for production deployments

## 📝 API Endpoints

See [API.md](docs/API.md) for complete API documentation.

### Chat
- `POST /chat` - Send chat message

### Summary Generation
- `POST /generate-summary` - Generate performance summary

### KPI Calculation
- `POST /calculate-kpis` - Calculate KPIs for crew member

### Crew Search
- `POST /crew/search` - Search crew members
- `GET /crew/:id` - Get crew member by ID
- `GET /crew/:id/profile` - Get complete crew profile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🔄 Scheduled Tasks

The application includes automated scheduled tasks:

- **Daily Summary Generation**: Runs daily at 2:00 AM UTC
  - Generates summaries for crew members needing refresh (15+ days old)
  - Processes in batch mode for efficiency

## 📚 Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Anthropic Claude API](https://docs.anthropic.com/)

## 🎯 Roadmap

- [ ] Enhanced authentication with AWS Cognito
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Multi-language support
- [ ] Export functionality for reports

---

Built with ❤️ using AWS Amplify Gen 2, React, TypeScript, and Claude AI
