import { Injectable, Logger } from '@nestjs/common';

type CacheEntry = {
  id: string;
  destination: string;
  passwordHash: string | null;
  status: string;
  expiresAt: Date | null;
};

type StoredEntry = {
  value: CacheEntry;
  expiresAt: number;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, StoredEntry>();
  private readonly maxSize = 10000;
  private readonly defaultTtlMs = 300_000;

  get(slug: string): CacheEntry | undefined {
    const entry = this.cache.get(slug);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(slug);
      return undefined;
    }
    return entry.value;
  }

  set(slug: string, value: CacheEntry, ttlMs?: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(slug, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  invalidate(slug: string): void {
    this.cache.delete(slug);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
