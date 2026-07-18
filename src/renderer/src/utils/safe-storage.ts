type StorageShape = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const memoryStore = new Map<string, string>()

const memoryStorage: StorageShape = {
  getItem: (name) => memoryStore.get(name) ?? null,
  setItem: (name, value) => {
    memoryStore.set(name, value)
  },
  removeItem: (name) => {
    memoryStore.delete(name)
  }
}

export const safeStorage = (): StorageShape => {
  if (typeof window === 'undefined') {
    return memoryStorage
  }

  try {
    const storage = window.localStorage
    const probe = '__pulseboard_storage_probe__'
    storage.setItem(probe, 'ok')
    storage.removeItem(probe)
    return storage
  } catch (error) {
    console.warn('Local storage unavailable, falling back to in-memory state.', error)
    return memoryStorage
  }
}
