import type { ErrorCode, ErrorResponse } from '@worker-lab/push-contract'

export type ErrorStatus = 400 | 403 | 404 | 429 | 500 | 502

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: ErrorStatus

  constructor(code: ErrorCode, message: string, status: ErrorStatus, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

export function toErrorResponse(code: ErrorCode, message: string): ErrorResponse {
  return { error: { code, message } }
}
