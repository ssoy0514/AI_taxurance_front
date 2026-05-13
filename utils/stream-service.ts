import { handleCommonResponse } from '~/utils/error-handler'

export interface StreamOptions {
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (err: any) => void
  onAbort?: () => void
  onFinished?: () => void
}

export class StreamService {
  private ctx: any
  private reader: ReadableStreamDefaultReader | null = null
  private controller: AbortController | null = null

  constructor(ctx: any) {
    this.ctx = ctx
  }

  async fetchStream(url: string, params: any, options: StreamOptions) {
    this.stop()

    this.controller = new AbortController()
    const { store, error: nuxtError } = this.ctx

    try {
      const res = await fetch(process.env.apiUrl + url, {
        method: 'POST',
        signal: this.controller.signal,
        headers: {
          'Content-type': 'application/json',
          oamUserId: store.state.user?.id,
          sessionId: store.state.sessionId,
          channel: store.state.device,
        },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw { name: 'ApiError', status: res.status, data: errData }
      }

      this.reader = res.body?.getReader() || null
      if (!this.reader) return

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await this.reader.read()
        if (done) {
          if (options.onDone) options.onDone
          break
        }

        options.onChunk(decoder.decode(value, { stream: true }))
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (options.onAbort) options.onAbort
      } else if (err.name === 'ApiError') {
        handleCommonResponse(err.data, nuxtError)
      } else {
        if (options.onError) options.onError(err)
      }
    } finally {
      this.clenaup()
      if (options.onFinished) options.onFinished()
    }
  }

  stop() {
    if (this.reader) {
      this.reader.cancel().catch(() => {})
      this.reader = null
    }
    if (this.controller) {
      this.controller.abort()
      this.controller = null
    }
  }

  private clenaup() {
    this.reader = null
    this.controller = null
  }
}
