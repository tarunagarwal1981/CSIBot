/**
 * PostgreSQL Database Connection Pool
 * Singleton pattern for managing database connections with pooling, retry logic, and health checks
 * @module services/database/connection
 */

import { Pool, PoolClient } from 'pg';
import { getEnvironmentConfig } from '../../config/environment';
import { mapTableNames } from '../../config/tableMapping';

/**
 * Database connection pool singleton
 */
export class DatabaseConnection {
  private static instance: Pool | null = null;
  private static isShuttingDown = false;
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second

  /**
   * Gets or creates the database connection pool
   * Implements singleton pattern with lazy initialization
   */
  static async getPool(): Promise<Pool> {
    if (this.instance) {
      return this.instance;
    }

    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down. Cannot create new connections.');
    }

    const config = getEnvironmentConfig();

    // Create connection pool with optimized settings
    this.instance = new Pool({
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      ssl: config.DB_SSL
        ? {
            rejectUnauthorized: false, // For RDS, we typically don't verify the certificate
          }
        : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      statement_timeout: 30000, // Query timeout: 30 seconds
    });

    // Set up event handlers (includes search_path setup)
    this.setupEventHandlers();

    // Test the connection
    try {
      await this.instance.query('SELECT NOW()');
      console.log('✅ Database connection pool initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connection pool:', error);
      await this.closePool();
      throw error;
    }

    return this.instance;
  }

  /**
   * Sets up event handlers for the connection pool
   */
  private static setupEventHandlers(): void {
    if (!this.instance) return;

    const config = getEnvironmentConfig();

    // Set search_path on each new connection
    // This tells PostgreSQL to look in 'csi' schema first, then 'public'
    // Note: Using 'acquire' event because it provides the client
    this.instance.on('acquire', async (client) => {
      try {
        if (config.DB_SCHEMA && config.DB_SCHEMA !== 'public') {
          const schemaName = config.DB_SCHEMA.trim();
          if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(schemaName)) {
            await client.query(`SET search_path TO "${schemaName}", public`);
            console.log(`✅ PostgreSQL search_path set to: ${schemaName}, public`);
          }
        } else {
          await client.query('SET search_path TO public');
          console.log('✅ PostgreSQL search_path set to: public');
        }
      } catch (error: any) {
        console.error('❌ Failed to set search_path:', error.message);
      }
    });

    this.instance.on('connect', () => {
      console.log('🔌 New client connected to database');
    });

    this.instance.on('error', (err: Error) => {
      console.error('❌ Unexpected error on idle database client:', err);
      // Don't exit the process, just log the error
    });


    this.instance.on('remove', () => {
      console.log('📤 Client removed from pool');
    });
  }

  /**
   * Executes a query with retry logic and exponential backoff
   * @param sql SQL query string
   * @param params Query parameters
   * @param retryCount Current retry attempt (internal use)
   * @returns Array of result rows
   */
  static async query<T = any>(
    sql: string,
    params?: any[],
    retryCount = 0
  ): Promise<T[]> {
    const pool = await this.getPool();
    const startTime = Date.now();

    // Map table names if schema is not 'public'
    const config = getEnvironmentConfig();
    const mappedSql = config.DB_SCHEMA !== 'public' ? mapTableNames(sql) : sql;

    try {
      const result = await pool.query(mappedSql, params);
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        console.warn(`⚠️ Slow query detected (${duration}ms): ${mappedSql.substring(0, 100)}...`);
      } else {
        console.log(`✅ Query executed in ${duration}ms`);
      }

      return result.rows as T[];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`❌ Query failed after ${duration}ms:`, {
        sql: mappedSql.substring(0, 200),
        params: params?.slice(0, 5), // Log first 5 params for debugging
        error: error.message,
        code: error.code,
        retryCount,
      });

      // Retry logic for transient errors
      if (this.shouldRetry(error, retryCount)) {
        const delay = this.calculateRetryDelay(retryCount);
        console.log(`🔄 Retrying query in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await this.sleep(delay);
        return this.query<T>(mappedSql, params, retryCount + 1);
      }

      // Check for pool exhaustion
      if (error.code === 'ECONNREFUSED' || error.message?.includes('timeout')) {
        throw new Error(
          `Database connection failed. Check if the database is running and accessible. Original error: ${error.message}`
        );
      }

      // Check for query timeout
      if (error.code === '57014' || error.message?.includes('timeout')) {
        throw new Error(
          `Query timeout exceeded. The query took longer than 30 seconds. Original error: ${error.message}`
        );
      }

      throw error;
    }
  }

  /**
   * Executes a query and returns a single row or null
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Single result row or null
   */
  static async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Executes a transaction with automatic rollback on error
   * @param callback Function that receives a PoolClient and performs transaction operations
   * @returns Result of the callback function
   */
  static async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = await this.getPool();
    const client = await pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      console.log('🔄 Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      const duration = Date.now() - startTime;
      console.log(`✅ Transaction committed in ${duration}ms`);

      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      console.error(`❌ Transaction rolled back after ${duration}ms:`, {
        error: error.message,
        code: error.code,
      });

      throw new Error(
        `Transaction failed and was rolled back. Original error: ${error.message}`
      );
    } finally {
      client.release();
    }
  }

  /**
   * Performs a health check on the database connection
   * @returns true if database is healthy, false otherwise
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const pool = await this.getPool();
      const result = await pool.query('SELECT 1 as health_check');
      return result.rows.length === 1 && result.rows[0].health_check === 1;
    } catch (error: any) {
      console.error('❌ Database health check failed:', {
        error: error.message,
        code: error.code,
      });
      return false;
    }
  }

  /**
   * Closes the connection pool gracefully
   * Waits for active queries to complete before closing
   */
  static async closePool(): Promise<void> {
    if (!this.instance) {
      return;
    }

    if (this.isShuttingDown) {
      console.warn('⚠️ Pool shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    console.log('🛑 Closing database connection pool...');

    try {
      // Stop accepting new connections
      await this.instance.end();
      console.log('✅ Database connection pool closed successfully');
    } catch (error: any) {
      console.error('❌ Error closing database connection pool:', {
        error: error.message,
        code: error.code,
      });
      throw error;
    } finally {
      this.instance = null;
      this.isShuttingDown = false;
    }
  }

  /**
   * Determines if an error should trigger a retry
   * @param error The error that occurred
   * @param retryCount Current retry attempt
   * @returns true if should retry, false otherwise
   */
  private static shouldRetry(error: any, retryCount: number): boolean {
    if (retryCount >= this.MAX_RETRIES) {
      return false;
    }

    // Retry on transient errors
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      '57P01', // Admin shutdown
      '57P02', // Crash shutdown
      '57P03', // Cannot connect now
      '08003', // Connection does not exist
      '08006', // Connection failure
    ];

    return (
      retryableErrors.includes(error.code) ||
      error.message?.includes('timeout') ||
      error.message?.includes('connection')
    );
  }

  /**
   * Calculates retry delay with exponential backoff
   * @param retryCount Current retry attempt
   * @returns Delay in milliseconds
   */
  private static calculateRetryDelay(retryCount: number): number {
    return this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  }

  /**
   * Sleep utility for retry delays
   * @param ms Milliseconds to sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets pool statistics for monitoring
   * @returns Pool statistics object
   */
  static async getPoolStats(): Promise<{
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }> {
    if (!this.instance) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.instance.totalCount,
      idleCount: this.instance.idleCount,
      waitingCount: this.instance.waitingCount,
    };
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, closing database connections...');
  await DatabaseConnection.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, closing database connections...');
  await DatabaseConnection.closePool();
  process.exit(0);
});
