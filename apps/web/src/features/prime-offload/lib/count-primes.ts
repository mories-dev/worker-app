export type PrimeProgress = {
  checked: number
  found: number
}

const PROGRESS_REPORTS = 100

export function isPrime(n: number): boolean {
  if (n < 2) return false
  if (n % 2 === 0) return n === 2
  for (let divisor = 3; divisor * divisor <= n; divisor += 2) {
    if (n % divisor === 0) return false
  }
  return true
}

export function countPrimes(limit: number, onProgress?: (progress: PrimeProgress) => void): number {
  const reportEvery = Math.max(1, Math.floor(limit / PROGRESS_REPORTS))
  let found = 0
  for (let n = 2; n <= limit; n += 1) {
    if (isPrime(n)) found += 1
    if (onProgress && n % reportEvery === 0) onProgress({ checked: n, found })
  }
  return found
}
