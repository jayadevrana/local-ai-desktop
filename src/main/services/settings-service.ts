import { safeStorage } from 'electron'

import {
  DEFAULT_SETTINGS,
  EMBEDDED_LOCAL_AI_KEY,
  ROUTING_CONFIG_FILE,
  SETTINGS_FILE
} from '@shared/defaults'
import type { AppSettings, RoutingPreferences } from '@shared/types'

import { getDevOverrideApiKey } from '../env'
import { JsonStore } from '../lib/json-store'

interface PersistedSettings {
  settings: AppSettings
  encryptedApiKey: string | null
}

export class SettingsService {
  private readonly settingsStore: JsonStore<PersistedSettings>
  private readonly routingStore: JsonStore<RoutingPreferences>

  constructor(private readonly dataDir: string) {
    this.settingsStore = new JsonStore<PersistedSettings>(dataDir, SETTINGS_FILE, () => ({
      settings: DEFAULT_SETTINGS(dataDir),
      encryptedApiKey: null
    }))
    this.routingStore = new JsonStore<RoutingPreferences>(dataDir, ROUTING_CONFIG_FILE, () =>
      DEFAULT_SETTINGS(dataDir).routing
    )
  }

  private encrypt(secret: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(secret).toString('base64')
    }

    return Buffer.from(secret, 'utf8').toString('base64')
  }

  private decrypt(payload: string | null): string | null {
    if (!payload) {
      return null
    }

    const bytes = Buffer.from(payload, 'base64')
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(bytes)
    }

    return bytes.toString('utf8')
  }

  async getSettings(): Promise<AppSettings> {
    const persisted = await this.settingsStore.read()
    const routing = await this.routingStore.read()

    return {
      ...persisted.settings,
      routing,
      provider: {
        ...persisted.settings.provider,
        apiKeyPresent: Boolean(this.decrypt(persisted.encryptedApiKey) || EMBEDDED_LOCAL_AI_KEY)
      }
    }
  }

  async getApiKey(): Promise<string> {
    const devOverride = getDevOverrideApiKey()
    if (devOverride) {
      return devOverride
    }

    const persisted = await this.settingsStore.read()
    const stored = this.decrypt(persisted.encryptedApiKey)

    if (persisted.settings.provider.useEmbeddedKey || !stored) {
      return EMBEDDED_LOCAL_AI_KEY
    }

    return stored
  }

  async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const persisted = await this.settingsStore.read()
    const next = {
      ...persisted.settings,
      ...partial,
      provider: {
        ...persisted.settings.provider,
        ...(partial.provider ?? {})
      },
      routing: {
        ...persisted.settings.routing,
        ...(partial.routing ?? {})
      },
      features: {
        ...persisted.settings.features,
        ...(partial.features ?? {})
      },
      defaults: {
        ...persisted.settings.defaults,
        ...(partial.defaults ?? {})
      },
      storage: {
        ...persisted.settings.storage,
        ...(partial.storage ?? {})
      }
    }

    await this.settingsStore.write({
      settings: next,
      encryptedApiKey: persisted.encryptedApiKey
    })
    await this.routingStore.write(next.routing)

    return this.getSettings()
  }

  async setApiKey(apiKey: string | null, useEmbeddedKey: boolean): Promise<AppSettings> {
    const persisted = await this.settingsStore.read()
    const encryptedApiKey = apiKey?.trim() ? this.encrypt(apiKey.trim()) : null
    const nextSettings: AppSettings = {
      ...persisted.settings,
      provider: {
        ...persisted.settings.provider,
        apiKeyPresent: Boolean(apiKey?.trim() || EMBEDDED_LOCAL_AI_KEY),
        useEmbeddedKey
      }
    }

    await this.settingsStore.write({
      settings: nextSettings,
      encryptedApiKey
    })

    return this.getSettings()
  }
}
