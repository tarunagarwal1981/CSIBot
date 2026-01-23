/**
 * Local Express Server for Development
 * Mimics the Amplify Lambda functions for local testing
 * @module server/index
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatHandler } from './routes/chat.js';
import { generateSummaryHandler } from './routes/generate-summary.js';
import { calculateKPIsHandler } from './routes/calculate-kpis.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Crew Performance Chatbot API',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /chat',
      generateSummary: 'POST /generate-summary',
      calculateKPIs: 'POST /calculate-kpis',
      health: 'GET /health',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.post('/chat', chatHandler);
app.post('/generate-summary', generateSummaryHandler);
app.post('/calculate-kpis', calculateKPIsHandler);

// Helpful message for GET requests to API endpoints
// Returns 200 instead of 405 to avoid console errors from browser prefetching
app.get('/chat', (req, res) => {
  res.status(200).json({
    message: 'Chat API endpoint',
    note: 'This endpoint accepts POST requests only',
    example: {
      method: 'POST',
      url: '/chat',
      body: {
        message: 'Your question here',
        userId: 'user123',
        sessionId: 'optional-session-id'
      }
    }
  });
});

app.get('/generate-summary', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'This endpoint only accepts POST requests'
  });
});

app.get('/calculate-kpis', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'This endpoint only accepts POST requests'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local development server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   POST http://localhost:${PORT}/chat`);
  console.log(`   POST http://localhost:${PORT}/generate-summary`);
  console.log(`   POST http://localhost:${PORT}/calculate-kpis`);
  console.log(`\n💡 Update VITE_API_URL in .env to: http://localhost:${PORT}`);
});
