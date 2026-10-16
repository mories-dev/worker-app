import { describe, expect, it, vi } from 'vitest'
import { countPrimes, isPrime } from './count-primes.ts'

describe('isPrime', () => {
  it.each([
    [0, false],
    [1, false],
    [2, true],
    [3, true],
    [4, false],
    [9, false],
    [97, true],
    [7919, true],
    [7921, false],
  ])('isPrime(%i) === %s', (n, expected) => {
    expect(isPrime(n)).toBe(expected)
  })
})

describe('countPrimes', () => {
  it.each([
    [1, 0],
    [2, 1],
    [10, 4],
    [100, 25],
    [100_000, 9592],
  ])('counts %i -> %i primes', (limit, expected) => {
    expect(countPrimes(limit)).toBe(expected)
  })

  it('reports throttled, monotonic progress so the receiver is not flooded', () => {
    const onProgress = vi.fn()

    const found = countPrimes(100_000, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(100)
    const progress = onProgress.mock.calls.map(([value]) => value)
    expect(progress.at(-1)).toEqual({ checked: 100_000, found })
    expect(progress.every((value, i) => i === 0 || value.checked > progress[i - 1].checked)).toBe(true)
  })
})
