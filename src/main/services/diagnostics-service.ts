import { DIAGNOSTICS_FILE } from '@shared/defaults'
import type { DiagnosticLogEntry } from '@shared/types'

import { JsonStore } from '../lib/json-store'
import { createId } from '../lib/id'
import { redactSecrets } from '../lib/redact'

export class DiagnosticsService {
  private readonly store: JsonStore<DiagnosticLogEntry[]>

  constructor(dataDir: string) {
    this.store = new JsonStore<DiagnosticLogEntry[]>(dataDir, DIAGNOSTICS_FILE, () => [])
  }

  async list(): Promise<DiagnosticLogEntry[]> {
    return this.store.read()
  }

  async clear(): Promise<void> {
    await this.store.write([])
  }

  async log(entry: Omit<DiagnosticLogEntry, 'id' | 'timestamp'>): Promise<DiagnosticLogEntry> {
    const logs = await this.store.read()
    const nextEntry: DiagnosticLogEntry = {
      id: createId('log'),
      timestamp: Date.now(),
      ...entry,
      details: redactSecrets(entry.details) as Record<string, unknown> | undefined
    }

    await this.store.write([nextEntry, ...logs].slice(0, 500))
    return nextEntry
  }
}
