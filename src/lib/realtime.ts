// ─── REALTIME ENGINE (SSE) ─────────────────────────────────

type Callback = (data: any) => void

export function createSSE(url: string, onMessage: Callback) {
  let evt: EventSource | null = null

  function connect() {
    evt = new EventSource(url)

    evt.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data))
      } catch {
        onMessage(e.data)
      }
    }

    evt.onerror = () => {
      console.warn('[SSE] reconnecting...')
      evt?.close()
      setTimeout(connect, 3000)
    }
  }

  connect()

  return () => evt?.close()
}
