// ─── GLOBAL FEEDBACK ───────────────────────────────────────

type Listener = (msg: string) => void

const listeners: Listener[] = []

export function notify(msg: string) {
  listeners.forEach(fn => fn(msg))
}

export function subscribe(fn: Listener) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i !== -1) listeners.splice(i, 1)
  }
}
