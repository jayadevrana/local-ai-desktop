import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import dotenv from 'dotenv'

for (const file of ['.env.local', '.env']) {
  const fullPath = resolve(process.cwd(), file)
  if (existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false })
  }
}

export const getDevOverrideApiKey = (): string | null =>
  process.env.LOCAL_AI_API_KEY?.trim() || process.env.VENICE_API_KEY?.trim() || null
