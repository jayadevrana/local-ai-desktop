import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export class JsonStore<T> {
  constructor(
    private readonly baseDir: string,
    private readonly fileName: string,
    private readonly fallback: () => T
  ) {}

  private get filePath(): string {
    return join(this.baseDir, this.fileName)
  }

  async read(): Promise<T> {
    try {
      const raw = await readFile(this.filePath, 'utf8')
      return JSON.parse(raw) as T
    } catch {
      return this.fallback()
    }
  }

  async write(value: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(value, null, 2), 'utf8')
  }
}
