import { dialog } from 'electron'
import { writeFile } from 'node:fs/promises'

import { THREADS_FILE } from '@shared/defaults'
import type { ChatThread, ExportChatRequest } from '@shared/types'

import { JsonStore } from '../lib/json-store'
import { createId } from '../lib/id'

const sortThreads = (threads: ChatThread[]) =>
  [...threads].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1
    }

    return right.updatedAt - left.updatedAt
  })

export class HistoryService {
  private readonly store: JsonStore<ChatThread[]>

  constructor(dataDir: string) {
    this.store = new JsonStore<ChatThread[]>(dataDir, THREADS_FILE, () => [])
  }

  async listThreads(): Promise<ChatThread[]> {
    return sortThreads(await this.store.read())
  }

  async ensureThread(threadId?: string): Promise<ChatThread> {
    const threads = await this.store.read()
    const existing = threadId ? threads.find((thread) => thread.id === threadId) : null
    if (existing) {
      return existing
    }

    const now = Date.now()
    const nextThread: ChatThread = {
      id: createId('thread'),
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      favorite: false,
      projectScope: null,
      messages: []
    }

    await this.store.write(sortThreads([nextThread, ...threads]))
    return nextThread
  }

  async upsertThread(thread: ChatThread): Promise<ChatThread[]> {
    const threads = await this.store.read()
    const nextThreads = threads.some((item) => item.id === thread.id)
      ? threads.map((item) => (item.id === thread.id ? thread : item))
      : [thread, ...threads]

    await this.store.write(sortThreads(nextThreads))
    return sortThreads(nextThreads)
  }

  async togglePinned(threadId: string): Promise<ChatThread[]> {
    const threads = await this.store.read()
    const nextThreads = threads.map((thread) =>
      thread.id === threadId ? { ...thread, pinned: !thread.pinned, updatedAt: Date.now() } : thread
    )
    await this.store.write(sortThreads(nextThreads))
    return sortThreads(nextThreads)
  }

  async toggleFavorite(threadId: string): Promise<ChatThread[]> {
    const threads = await this.store.read()
    const nextThreads = threads.map((thread) =>
      thread.id === threadId
        ? { ...thread, favorite: !thread.favorite, updatedAt: Date.now() }
        : thread
    )
    await this.store.write(sortThreads(nextThreads))
    return sortThreads(nextThreads)
  }

  async renameThread(threadId: string, title: string): Promise<ChatThread[]> {
    const threads = await this.store.read()
    const nextThreads = threads.map((thread) =>
      thread.id === threadId ? { ...thread, title: title.trim() || thread.title, updatedAt: Date.now() } : thread
    )
    await this.store.write(sortThreads(nextThreads))
    return sortThreads(nextThreads)
  }

  async deleteThread(threadId: string): Promise<ChatThread[]> {
    const threads = await this.store.read()
    const nextThreads = threads.filter((thread) => thread.id !== threadId)
    await this.store.write(sortThreads(nextThreads))
    return sortThreads(nextThreads)
  }

  async clearAll(): Promise<void> {
    await this.store.write([])
  }

  async exportThread(request: ExportChatRequest): Promise<boolean> {
    const threads = await this.store.read()
    const thread = threads.find((item) => item.id === request.threadId)
    if (!thread) {
      return false
    }

    const extension = request.format === 'markdown' ? 'md' : 'json'
    const result = await dialog.showSaveDialog({
      defaultPath: `${thread.title.replace(/[^\w-]+/g, '-').toLowerCase() || 'chat'}.${extension}`
    })

    if (result.canceled || !result.filePath) {
      return false
    }

    const payload =
      request.format === 'json'
        ? JSON.stringify(thread, null, 2)
        : [
            `# ${thread.title}`,
            '',
            ...thread.messages.flatMap((message) => [
              `## ${message.role === 'user' ? 'You' : 'Assistant'} • ${new Date(message.createdAt).toLocaleString()}`,
              '',
              message.text || '',
              message.assetUrl ? '' : '',
              message.assetUrl ? `[Asset](${message.assetUrl})` : '',
              ''
            ])
          ].join('\n')

    await writeFile(result.filePath, payload, 'utf8')
    return true
  }
}
