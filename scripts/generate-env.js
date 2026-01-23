// Script to help generate .env file interactively
// Usage: node scripts/generate-env.js

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const questions = [
  { key: 'DB_HOST', prompt: 'RDS Endpoint (e.g., your-db.rds.amazonaws.com): ' },
  { key: 'DB_NAME', prompt: 'Database Name (e.g., crew_performance): ' },
  { key: 'DB_USER', prompt: 'Database User (e.g., postgres): ' },
  { key: 'DB_PASSWORD', prompt: 'Database Password: ', hide: true },
  { key: 'ANTHROPIC_API_KEY', prompt: 'Anthropic API Key (sk-ant-...): ' },
];

// Helper to hide password input (basic implementation)
function hideInput(input) {
  return input.replace(/./g, '*');
}

async function askQuestion(question) {
  return new Promise((resolve) => {
    if (question.hide) {
      // For password, we'll still show input but mask it
      rl.question(question.prompt, (answer) => {
        resolve(answer);
      });
      // Note: In a real implementation, you might want to use a library
      // like 'readline-sync' or 'inquirer' for better password handling
    } else {
      rl.question(question.prompt, resolve);
    }
  });
}

async function generateEnv() {
  console.log('🚀 Crew Performance Chatbot - Environment Setup\n');
  console.log('This script will help you create a .env file with required configuration.\n');

  const env = {};

  // Ask required questions
  for (const q of questions) {
    const answer = await askQuestion(q);
    if (!answer.trim()) {
      console.log(`⚠️  Warning: ${q.key} is empty. You may need to set it later.\n`);
    }
    env[q.key] = answer.trim();
  }

  // Add defaults
  env.DB_PORT = '5432';
  env.DB_SSL = 'true';
  env.NODE_ENV = 'development';
  env.CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
  env.API_URL = 'http://localhost:3000';
  env.ENABLE_SUMMARY_GENERATION = 'true';
  env.ENABLE_RISK_DETECTION = 'true';
  env.SUMMARY_REFRESH_DAYS = '15';
  env.MAX_TOKENS_PER_REQUEST = '4000';
  env.MAX_REQUESTS_PER_MINUTE = '20';

  // Generate .env content
  const envContent = `# Database Configuration
DB_HOST=${env.DB_HOST}
DB_PORT=${env.DB_PORT}
DB_NAME=${env.DB_NAME}
DB_USER=${env.DB_USER}
DB_PASSWORD=${env.DB_PASSWORD}
DB_SSL=${env.DB_SSL}

# Claude API Configuration
ANTHROPIC_API_KEY=${env.ANTHROPIC_API_KEY}
CLAUDE_MODEL=${env.CLAUDE_MODEL}

# Application Configuration
NODE_ENV=${env.NODE_ENV}
API_URL=${env.API_URL}

# Feature Flags
ENABLE_SUMMARY_GENERATION=${env.ENABLE_SUMMARY_GENERATION}
ENABLE_RISK_DETECTION=${env.ENABLE_RISK_DETECTION}
SUMMARY_REFRESH_DAYS=${env.SUMMARY_REFRESH_DAYS}

# Rate Limiting
MAX_TOKENS_PER_REQUEST=${env.MAX_TOKENS_PER_REQUEST}
MAX_REQUESTS_PER_MINUTE=${env.MAX_REQUESTS_PER_MINUTE}
`;

  // Write .env file
  const envPath = path.join(process.cwd(), '.env');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env file created successfully!');
  console.log(`📁 Location: ${envPath}\n`);
  console.log('⚠️  Important: Never commit .env to version control!\n');
  
  rl.close();
}

// Handle errors
process.on('SIGINT', () => {
  console.log('\n\n❌ Setup cancelled.');
  rl.close();
  process.exit(0);
});

generateEnv().catch((error) => {
  console.error('\n❌ Error generating .env file:', error.message);
  rl.close();
  process.exit(1);
});
