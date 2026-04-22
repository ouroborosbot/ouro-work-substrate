import { describe, expect, it } from "vitest"
import { InMemoryRateLimiter } from "../rate-limit"

describe("rate limiter", () => {
  it("allows bounded calls and resets after the window", () => {
    let now = 1000
    const limiter = new InMemoryRateLimiter(100, 2, () => now)

    expect(limiter.take("slugger").allowed).toBe(true)
    expect(limiter.take("slugger").allowed).toBe(true)
    expect(limiter.take("slugger").allowed).toBe(false)
    now = 1200
    expect(limiter.take("slugger").allowed).toBe(true)
  })

  it("uses Date.now by default", () => {
    const limiter = new InMemoryRateLimiter(100, 1)

    expect(limiter.take("slugger").remaining).toBe(0)
  })
})
