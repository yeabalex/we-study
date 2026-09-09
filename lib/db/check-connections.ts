import { MongoClient } from 'mongodb';
import Redis from 'ioredis';

export interface ConnectionHealth {
  connected: boolean;
  latencyMs: number;
  error?: string;
  uri?: string;
}

export interface SystemDbStatus {
  mongodb: ConnectionHealth;
  redis: ConnectionHealth;
  allConnected: boolean;
}

/**
 * Checks and confirms active connection to MongoDB
 */
export async function checkMongoConnection(): Promise<ConnectionHealth> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/we-study';
  const start = Date.now();

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    await client.connect();
    await client.db().command({ ping: 1 });
    await client.close();
    return {
      connected: true,
      latencyMs: Date.now() - start,
      uri,
    };
  } catch (err: any) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      error: err.message || 'Could not connect to MongoDB',
      uri,
    };
  }
}

/**
 * Checks and confirms active connection to Redis
 */
export async function checkRedisConnection(): Promise<ConnectionHealth> {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const start = Date.now();

  return new Promise((resolve) => {
    try {
      const redis = new Redis(url, {
        connectTimeout: 3000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });

      redis.ping((err, res) => {
        const latencyMs = Date.now() - start;
        redis.disconnect();

        if (err || res !== 'PONG') {
          resolve({
            connected: false,
            latencyMs,
            error: err?.message || 'Redis PING failed',
            uri: url,
          });
        } else {
          resolve({
            connected: true,
            latencyMs,
            uri: url,
          });
        }
      });

      redis.on('error', (err) => {
        resolve({
          connected: false,
          latencyMs: Date.now() - start,
          error: err.message,
          uri: url,
        });
      });
    } catch (err: any) {
      resolve({
        connected: false,
        latencyMs: Date.now() - start,
        error: err.message,
        uri: url,
      });
    }
  });
}

/**
 * Confirms both MongoDB and Redis connections and prints console status
 */
export async function verifyAllDbConnections(): Promise<SystemDbStatus> {
  const [mongoStatus, redisStatus] = await Promise.all([
    checkMongoConnection(),
    checkRedisConnection(),
  ]);

  console.log('\n======================================================');
  console.log('🔍 [WeStudy] Verifying Database Connections...');
  console.log('======================================================');

  if (mongoStatus.connected) {
    console.log(`✓ MongoDB Connected: ${mongoStatus.uri} (${mongoStatus.latencyMs}ms)`);
  } else {
    console.error(`✗ MongoDB FAILED: ${mongoStatus.error}`);
    console.error(`  💡 Run: docker compose up -d`);
  }

  if (redisStatus.connected) {
    console.log(`✓ Redis Connected:   ${redisStatus.uri} (${redisStatus.latencyMs}ms)`);
  } else {
    console.error(`✗ Redis FAILED:   ${redisStatus.error}`);
    console.error(`  💡 Run: docker compose up -d`);
  }

  const allConnected = mongoStatus.connected && redisStatus.connected;
  if (allConnected) {
    console.log('🎉 All database connections verified successfully!');
  } else {
    console.warn('⚠️  Some databases are not reachable. Ensure Docker containers are running.');
  }
  console.log('======================================================\n');

  return {
    mongodb: mongoStatus,
    redis: redisStatus,
    allConnected,
  };
}
