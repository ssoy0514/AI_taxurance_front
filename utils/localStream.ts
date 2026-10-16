// utils/localStream.ts
// taxurance.vue 전용 스트리밍 — 전역 $stream(plugins/stream.ts) 싱글톤을 쓰지 않고
// 호출마다 독립된 AbortController를 가져서, 같은 화면 안의 스트림끼리도
// (예: 최종화법 생성 ↔ 번역) 서로 끊지 않는다. 다른 페이지의 $stream에는 영향 없음.
import { handleCommonResponse } from '@/utils/error-handler'

export interface LocalStreamOptions {
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (err: any) => void
  onAbort?: () => void
  onFinished?: () => void
}

export interface LocalStreamCtx {
  channel: string
  nuxtError: (err: any) => void
}

async function runStream(
  controller: AbortController,
  streamControllers: AbortController[],
  ctx: LocalStreamCtx,
  url: string,
  params: any,
  options: LocalStreamOptions
) {
  streamControllers.push(controller)
  let reader: ReadableStreamDefaultReader | null = null

  try {
    const res = await fetch('/api/v1' + url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-type': 'application/json',
        channel: ctx.channel,
      },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      let errData: any = null
      try {
        errData = await res.json()
      } catch {
      }
      throw { name: 'ApiError', status: res.status, data: errData }
    }

    reader = res.body?.getReader() || null
    if (!reader) return

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        if (options.onDone) options.onDone()
        break
      }
      options.onChunk(decoder.decode(value, { stream: true }))
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      if (options.onAbort) options.onAbort()
    } else if (err.name === 'ApiError') {
      // 502만 재시도 대상으로 onError로 넘기고,
      // 세션만료 등 다른 API 에러는 기존처럼 handleCommonResponse가 처리
      if (err.status === 502) {
        if (options.onError) options.onError(err)
      } else {
        handleCommonResponse(err.data, ctx.nuxtError)
      }
    } else {
      if (options.onError) options.onError(err)
    }
  } finally {
    const idx = streamControllers.indexOf(controller)
    if (idx > -1) streamControllers.splice(idx, 1)
    if (options.onFinished) options.onFinished()
  }
}

// activeByKey / pendingByKey: key(대상 객체) 단위 -> 최신 요청만 유지
// activeCount / waitQueue: 세션 동시처리 요청 개수를 제한
const activeByKey = new WeakMap<object, AbortController>()
const pendingByKey = new WeakMap<object, symbol>()
 
const MAX_CONCURRENT = 3 // 3개로 제한
let activeCount = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeCount++
      resolve()
    })
  })
}

function releaseSlot() {
  activeCount--
  const next = waitQueue.shift()
  if (next) next()
}

// key 단위로 대기 → 실행 → (502면) 재시도
async function runManagedStream(
  streamControllers: AbortController[],
  key: object,
  replaceToken: symbol,
  ctx: LocalStreamCtx,
  url: string,
  params: any,
  options: LocalStreamOptions
) {
  await acquireSlot()
  try {
    const MAX_RETRY_MS = 30000
    const startedAt = Date.now()
    let attempt = 0

    while (true) {
      // 대기하거나 재시도하는 사이 같은 key로 더 최신 요청이 들어왔으면, 지금 이 실행은
      // 조용히 중단한다 (새 요청 쪽이 이어서 처리함).
      if (pendingByKey.get(key) !== replaceToken) break

      const controller = new AbortController()
      activeByKey.set(key, controller)

      let failed = false
      let failErr: any = null

      await runStream(controller, streamControllers, ctx, url, params, {
        ...options,
        onError: (err) => {
          failed = true
          failErr = err
        },
        onFinished: () => {
          if (activeByKey.get(key) === controller) activeByKey.delete(key)
          // 재시도 여부는 아래에서 판단하고 나서 options.onFinished를 호출한다
        },
      })

      const is502 = failed && failErr?.status === 502
      const shouldRetry = is502 && Date.now() - startedAt < MAX_RETRY_MS

      if (!shouldRetry) {
        if (failed && options.onError) options.onError(failErr)
        if (options.onFinished) options.onFinished()
        break
      }

      attempt++
      await new Promise((r) => setTimeout(r, Math.min(500 * attempt, 3000)))
    }
  } finally {
    releaseSlot()
  }
}

export async function fetchLocalStream(
  streamControllers: AbortController[],
  ctx: LocalStreamCtx,
  url: string,
  params: any,
  options: LocalStreamOptions
) {
  // 화법 생성은 호출마다 새 메시지를 대상으로 한다(startStreaming()이 매번 messages
  // 배열에 새 항목을 push함). 그래서 다른 어떤 호출과도 절대 같아질 수 없는 새 객체를
  // key로 써서, fetchLocalStreamReplacing의 "교체" 로직이 자연히 발동하지 않게 한다.
  await fetchLocalStreamReplacing(streamControllers, {}, ctx, url, params, options)
}

// [0920 수정] "같은 대상(key)에 새 요청이 들어오면 진행 중이던 이전 요청을 취소하고 그 자리를
// 교체한다" - 예전 $stream이 fetchStream() 시작할 때마다 무조건 하나 있던 이전 스트림을 끊던
// 동작을, 전역이 아니라 key 단위로 스코프를 좁혀서 재현한 것. (예: 같은 메시지를 다른 언어로
// 번역 누르면 이전 번역은 취소되고 새 번역으로 교체됨 - 서로 다른 메시지끼리는 안 건드림)
export async function fetchLocalStreamReplacing(
  streamControllers: AbortController[],
  key: object,
  ctx: LocalStreamCtx,
  url: string,
  params: any,
  options: LocalStreamOptions
) {
  const prev = activeByKey.get(key)
  if (prev) prev.abort()

  const token = Symbol()
  pendingByKey.set(key, token)

  await runManagedStream(streamControllers, key, token, ctx, url, params, options)
}

export function stopLocalStreams(streamControllers: AbortController[]) {
  streamControllers.forEach((c) => c.abort())
  streamControllers.length = 0
  // 아직 시작 안 하고 대기열에 있던 요청들도 같이 정리 - 안 지우면 컴포넌트가 사라진 뒤에
  // 자리가 나서 예전 콜백이 뒤늦게 실행되거나, Promise가 영영 안 풀리고 남을 수 있음
  waitQueue.length = 0
  activeCount = 0
}
