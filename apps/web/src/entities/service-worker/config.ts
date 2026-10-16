export const SW_SCRIPT_URL = `${import.meta.env.BASE_URL}sw.js`

// public/sw.js の CACHE_PREFIX / SKIP_WAITING と手作業で揃える必要がある
export const SW_CACHE_PREFIX = 'worker-lab-'
export const SKIP_WAITING_MESSAGE = { type: 'SKIP_WAITING' } as const
