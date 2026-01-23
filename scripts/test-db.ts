/**
 * Test Database Connection and Chat Tables
 * Run this to diagnose database issues
 */

import 'dotenv/config';
import { DatabaseConnection } from '../src/services/database/connection.js';
import { getEnvironmentConfig } from '../src/config/environment.js';

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    const config = getEnvironmentConfig();
    console.log('Configuration:');
    console.log(`  DB_HOST: ${config.DB_HOST}`);
    console.log(`  DB_PORT: ${config.DB_PORT}`);
    console.log(`  DB_NAME: ${config.DB_NAME}`);
    console.log(`  DB_USER: ${config.DB_USER}`);
    console.log(`  DB_PASSWORD: ${config.DB_PASSWORD ? '***' + config.DB_PASSWORD.slice(-4) : '(empty)'} (length: ${config.DB_PASSWORD?.length || 0})`);
    console.log(`  DB_SCHEMA: ${config.DB_SCHEMA}`);
    console.log(`  DB_SSL: ${config.DB_SSL}\n`);

    // Test connection
    console.log('1. Testing database connection...');
    const pool = await DatabaseConnection.getPool();
    console.log('✅ Database connection successful!\n');

    // Check if schema exists
    console.log(`2. Checking if schema '${config.DB_SCHEMA}' exists...`);
    const schemaCheck = await DatabaseConnection.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
      [config.DB_SCHEMA]
    );
    if (schemaCheck.length === 0) {
      console.log(`⚠️  Schema '${config.DB_SCHEMA}' does not exist!`);
      console.log(`   You may need to create it: CREATE SCHEMA IF NOT EXISTS ${config.DB_SCHEMA};`);
    } else {
      console.log(`✅ Schema '${config.DB_SCHEMA}' exists\n`);
    }

    // Check if chat_session table exists
    console.log(`3. Checking if table 'chat_session' exists in schema '${config.DB_SCHEMA}'...`);
    const tableCheck = await DatabaseConnection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = $1 AND table_name = 'chat_session'`,
      [config.DB_SCHEMA]
    );
    if (tableCheck.length === 0) {
      console.log(`❌ Table 'chat_session' does not exist in schema '${config.DB_SCHEMA}'!`);
      console.log(`   Run: psql -h ${config.DB_HOST} -U ${config.DB_USER} -d ${config.DB_NAME} -f scripts/create-chat-tables.sql\n`);
    } else {
      console.log(`✅ Table 'chat_session' exists\n`);
    }

    // Check if chat_message table exists
    console.log(`4. Checking if table 'chat_message' exists in schema '${config.DB_SCHEMA}'...`);
    const messageTableCheck = await DatabaseConnection.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = $1 AND table_name = 'chat_message'`,
      [config.DB_SCHEMA]
    );
    if (messageTableCheck.length === 0) {
      console.log(`❌ Table 'chat_message' does not exist in schema '${config.DB_SCHEMA}'!`);
      console.log(`   Run: psql -h ${config.DB_HOST} -U ${config.DB_USER} -d ${config.DB_NAME} -f scripts/create-chat-tables.sql\n`);
    } else {
      console.log(`✅ Table 'chat_message' exists\n`);
    }

    // Test a simple query
    console.log('5. Testing a simple query...');
    const testQuery = await DatabaseConnection.query('SELECT NOW() as current_time');
    console.log(`✅ Query successful! Current time: ${testQuery[0].current_time}\n`);

    console.log('✅ All database checks passed!');
    
    await DatabaseConnection.closePool();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database test failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

testDatabase();
