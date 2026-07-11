import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Reads Supabase credentials straight from .env (same values Vite injects into
// the app) since the Playwright process doesn't get VITE_-prefixed env vars
// automatically. Returns an empty object if .env isn't present.
export function loadEnv(): Record<string, string> {
  const envPath = join(__dirname, '..', '..', '.env')
  if (!existsSync(envPath)) return {}
  const vars: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([\w.]+)=(.*)$/)
    if (match) vars[match[1]] = match[2].trim()
  }
  return vars
}
