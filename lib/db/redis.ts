import Redis from 'ioredis';
import { GenerationSessionState, Phase1FileAnalysis, Phase2SequencePlan, Phase3RangeContent } from '@/types/we-study';

const redisUrl = process.env.REDIS_URL || '';
let redisClient: Redis | null = null;

// In-memory fallback cache for development
class MemoryCache {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }
}

declare global {
  var _redisClient: Redis | undefined;
  var _memoryCache: MemoryCache | undefined;
}

export const memoryCache: MemoryCache = global._memoryCache || (global._memoryCache = new MemoryCache());

export function getRedisClient(): Redis | null {
  if (!redisUrl) return null;

  if (!global._redisClient) {
    try {
      global._redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 100, 3000);
        },
      });
      global._redisClient.on('error', (err) => {
        console.warn('Redis connection error, falling back to memoryCache:', err.message);
      });
    } catch {
      return null;
    }
  }
  return global._redisClient;
}

/**
 * High-level Session Cache Methods for WeStudy Pipeline
 */
export const sessionCache = {
  // 1. Pipeline State (Polled by Frontend every 3s)
  async getSessionState(sessionId: string): Promise<GenerationSessionState | null> {
    const client = getRedisClient();
    const key = `session:${sessionId}:state`;
    const data = client ? await client.get(key) : await memoryCache.get(key);
    return data ? JSON.parse(data) : null;
  },

  async setSessionState(sessionId: string, state: GenerationSessionState, ttlSeconds = 7200): Promise<void> {
    const client = getRedisClient();
    const key = `session:${sessionId}:state`;
    const val = JSON.stringify(state);
    if (client) {
      await client.set(key, val, 'EX', ttlSeconds);
    } else {
      await memoryCache.set(key, val, 'EX', ttlSeconds);
    }
  },

  // 2. Phase 1 File Output
  async savePhase1File(sessionId: string, fileId: string, data: Phase1FileAnalysis, ttlSeconds = 7200): Promise<void> {
    const client = getRedisClient();
    const key = `session:${sessionId}:file:${fileId}`;
    const val = JSON.stringify(data);
    if (client) {
      await client.set(key, val, 'EX', ttlSeconds);
    } else {
      await memoryCache.set(key, val, 'EX', ttlSeconds);
    }
  },

  async getPhase1File(sessionId: string, fileId: string): Promise<Phase1FileAnalysis | null> {
    const client = getRedisClient();
    const key = `session:${sessionId}:file:${fileId}`;
    const data = client ? await client.get(key) : await memoryCache.get(key);
    return data ? JSON.parse(data) : null;
  },

  async getAllPhase1Files(sessionId: string): Promise<Phase1FileAnalysis[]> {
    const client = getRedisClient();
    const pattern = `session:${sessionId}:file:*`;
    const keys = client ? await client.keys(pattern) : await memoryCache.keys(pattern);
    const results: Phase1FileAnalysis[] = [];
    for (const key of keys) {
      const data = client ? await client.get(key) : await memoryCache.get(key);
      if (data) results.push(JSON.parse(data));
    }
    return results;
  },

  // 3. Phase 2 Sequence Output
  async savePhase2Sequence(sessionId: string, data: Phase2SequencePlan, ttlSeconds = 7200): Promise<void> {
    const client = getRedisClient();
    const key = `session:${sessionId}:sequence`;
    const val = JSON.stringify(data);
    if (client) {
      await client.set(key, val, 'EX', ttlSeconds);
    } else {
      await memoryCache.set(key, val, 'EX', ttlSeconds);
    }
  },

  async getPhase2Sequence(sessionId: string): Promise<Phase2SequencePlan | null> {
    const client = getRedisClient();
    const key = `session:${sessionId}:sequence`;
    const data = client ? await client.get(key) : await memoryCache.get(key);
    return data ? JSON.parse(data) : null;
  },

  // 4. Phase 3 Range Content Output
  async savePhase3Range(sessionId: string, fileId: string, rangeId: string, data: Phase3RangeContent, ttlSeconds = 7200): Promise<void> {
    const client = getRedisClient();
    const key = `session:${sessionId}:content:${fileId}:${rangeId}`;
    const val = JSON.stringify(data);
    if (client) {
      await client.set(key, val, 'EX', ttlSeconds);
    } else {
      await memoryCache.set(key, val, 'EX', ttlSeconds);
    }
  },

  async getPhase3Range(sessionId: string, fileId: string, rangeId: string): Promise<Phase3RangeContent | null> {
    const client = getRedisClient();
    const key = `session:${sessionId}:content:${fileId}:${rangeId}`;
    const data = client ? await client.get(key) : await memoryCache.get(key);
    return data ? JSON.parse(data) : null;
  },
};
