import { z } from 'zod'

export const DEFAULT_PUSH_SERVER_PORT = 8787

export const pushServerPortSchema = z.coerce.number().int().min(1).max(65535).default(DEFAULT_PUSH_SERVER_PORT)
