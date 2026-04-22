export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  resetAt: number
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  take(key: string): RateLimitDecision {
    const now = this.now()
    const existing = this.buckets.get(key)
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + this.windowMs
      this.buckets.set(key, { count: 1, resetAt })
      return { allowed: true, remaining: Math.max(0, this.max - 1), resetAt }
    }
    if (existing.count >= this.max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt }
    }
    existing.count += 1
    return { allowed: true, remaining: Math.max(0, this.max - existing.count), resetAt: existing.resetAt }
  }
}

