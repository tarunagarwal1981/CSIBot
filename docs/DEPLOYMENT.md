# Deployment Guide

## Overview

This guide covers deploying the Crew Performance Chatbot to AWS using Amplify Gen 2. The deployment process includes setting up the backend infrastructure, configuring environment variables, and deploying the frontend.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js** v18+ installed
4. **Git** repository set up
5. **PostgreSQL Database** (RDS instance recommended)
6. **Anthropic API Key**

## Pre-Deployment Checklist

- [ ] Database schema created and populated
- [ ] Environment variables documented
- [ ] AWS credentials configured
- [ ] Git repository initialized
- [ ] All tests passing
- [ ] Code linted and formatted

## Environment Setup

### 1. Configure AWS Credentials

```bash
aws configure
```

Or set environment variables:
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### 2. Initialize Amplify

```bash
npx ampx configure
```

Follow the prompts to:
- Select AWS profile
- Choose region
- Set up Amplify backend

### 3. Set Environment Variables

Create `.env` file or configure in AWS:

**Required Variables:**
- `DB_HOST` - PostgreSQL RDS endpoint
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `ANTHROPIC_API_KEY` - Claude API key

**Optional Variables:**
- `DB_PORT` - Database port (default: 5432)
- `DB_SSL` - SSL enabled (default: true)
- `CLAUDE_MODEL` - Model version
- `NODE_ENV` - Environment (production/development)

## Deployment Methods

### Method 1: Amplify Pipeline Deployment (Recommended)

#### Development Deployment

```bash
npm run deploy:dev
```

This deploys to the `dev` branch and creates/updates the Amplify app.

#### Production Deployment

```bash
npm run deploy:prod
```

This deploys to the `main` branch for production.

### Method 2: Git-Based Deployment

1. **Push to Repository**
   ```bash
   git add .
   git commit -m "Deploy to production"
   git push origin main
   ```

2. **Amplify Auto-Deploy**
   - If Amplify is connected to your Git repository, it will automatically deploy
   - Check Amplify Console for deployment status

### Method 3: Manual Deployment

1. **Build Frontend**
   ```bash
   npm run build
   ```

2. **Deploy Backend**
   ```bash
   npx ampx sandbox --once
   ```

3. **Deploy Frontend**
   - Upload `dist/` folder to S3 or use Amplify Console

## Backend Deployment

### Lambda Functions

All Lambda functions are automatically deployed with Amplify:

1. **Chat Function**
   - Timeout: 60 seconds
   - Memory: 1024 MB
   - Environment variables configured

2. **Generate Summary Function**
   - Timeout: 300 seconds (5 minutes)
   - Memory: 1024 MB
   - Scheduled trigger: Daily at 2 AM UTC

3. **Calculate KPIs Function**
   - Timeout: 180 seconds (3 minutes)
   - Memory: 1024 MB

### Environment Variables Configuration

Set environment variables in Amplify Console or via CLI:

```bash
# Using Amplify CLI
npx ampx sandbox --env DB_HOST=your-host --env DB_PASSWORD=your-password
```

Or configure in `amplify/backend.ts`:
```typescript
environment: {
  DB_HOST: process.env.DB_HOST!,
  // ... other variables
}
```

### Database Connection

1. **RDS Security Group**
   - Allow inbound connections from Lambda security group
   - Port: 5432 (PostgreSQL)

2. **VPC Configuration** (if Lambda in VPC)
   - Configure VPC settings in Lambda
   - Ensure NAT Gateway for internet access

3. **Connection String**
   - Format: `postgresql://user:password@host:port/database`
   - SSL enabled for RDS

## Frontend Deployment

### Build Configuration

The frontend is built using Vite:

```bash
npm run build
```

Output: `dist/` directory

### Amplify Hosting

1. **Connect Repository**
   - Go to Amplify Console
   - Connect Git repository
   - Select branch (main for production)

2. **Build Settings**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Node version: 18.x

3. **Environment Variables**
   - Set `VITE_API_URL` to your API endpoint
   - Other frontend variables as needed

### Custom Domain

1. **Add Domain**
   - Go to Amplify Console → Domain Management
   - Add custom domain
   - Configure DNS records

2. **SSL Certificate**
   - Amplify automatically provisions SSL certificate
   - Wait for DNS propagation

## Post-Deployment

### 1. Verify Deployment

- [ ] Frontend accessible
- [ ] API endpoints responding
- [ ] Database connection working
- [ ] Lambda functions executing
- [ ] Scheduled tasks running

### 2. Test Endpoints

```bash
# Health check
curl https://your-api.amplifyapp.com/health

# Chat endpoint
curl -X POST https://your-api.amplifyapp.com/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test","userId":"test123"}'
```

### 3. Monitor Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/chat-function --follow

# View Amplify logs
# Go to Amplify Console → App → Monitoring
```

### 4. Set Up Monitoring

- CloudWatch Alarms for errors
- CloudWatch Dashboards for metrics
- SNS notifications for critical issues

## Rollback Procedure

### Rollback Frontend

1. Go to Amplify Console
2. Select previous deployment
3. Click "Redeploy this version"

### Rollback Backend

1. Revert code changes
2. Push to repository
3. Amplify will redeploy automatically

Or manually:
```bash
git revert HEAD
git push origin main
```

## Troubleshooting

### Common Issues

#### 1. Lambda Timeout

**Problem**: Function times out

**Solution**:
- Increase timeout in `amplify/functions/*/resource.ts`
- Optimize database queries
- Check for infinite loops

#### 2. Database Connection Failed

**Problem**: Cannot connect to database

**Solution**:
- Verify security group rules
- Check VPC configuration
- Verify credentials
- Test connection from Lambda

#### 3. CORS Errors

**Problem**: CORS errors in browser

**Solution**:
- Verify CORS headers in Lambda responses
- Check API Gateway CORS configuration
- Update allowed origins

#### 4. Environment Variables Not Set

**Problem**: Variables undefined

**Solution**:
- Verify variables in Amplify Console
- Check Lambda environment configuration
- Restart Lambda functions

#### 5. Scheduled Tasks Not Running

**Problem**: EventBridge rule not triggering

**Solution**:
- Verify EventBridge rule exists
- Check Lambda permissions
- Verify cron expression
- Check CloudWatch logs

## Production Best Practices

### Security

1. **Secrets Management**
   - Use AWS Secrets Manager for sensitive data
   - Never commit secrets to Git
   - Rotate credentials regularly

2. **Network Security**
   - Use VPC for Lambda functions
   - Enable SSL for database
   - Configure security groups properly

3. **Access Control**
   - Enable AWS Cognito authentication
   - Implement role-based access control
   - Use IAM policies

### Performance

1. **Caching**
   - Implement caching for frequently accessed data
   - Use CloudFront for static assets
   - Cache API responses where appropriate

2. **Database Optimization**
   - Use connection pooling
   - Optimize queries with indexes
   - Monitor slow queries

3. **Lambda Optimization**
   - Use provisioned concurrency for critical functions
   - Optimize cold start times
   - Monitor memory usage

### Monitoring

1. **CloudWatch**
   - Set up dashboards
   - Create alarms
   - Monitor error rates

2. **Logging**
   - Structured logging
   - Log levels (INFO, WARN, ERROR)
   - Centralized log aggregation

3. **Metrics**
   - Track API response times
   - Monitor database connections
   - Track token usage

## Cost Optimization

1. **Lambda**
   - Right-size memory allocation
   - Use appropriate timeout values
   - Monitor invocation counts

2. **Database**
   - Use RDS reserved instances
   - Optimize query performance
   - Archive old data

3. **API Gateway**
   - Cache responses
   - Use compression
   - Monitor usage

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check performance metrics
   - Update dependencies

2. **Monthly**
   - Review costs
   - Update security patches
   - Optimize queries

3. **Quarterly**
   - Review architecture
   - Update documentation
   - Security audit

## Support

For deployment issues:

1. Check CloudWatch logs
2. Review Amplify Console
3. Consult AWS documentation
4. Contact support team
