// ─── PLUGIN SYSTEM ─────────────────────────────────────────

type Plugin = {
  name: string
  init: () => void
}

const plugins: Plugin[] = []

export function registerPlugin(plugin: Plugin) {
  plugins.push(plugin)
}

export function initPlugins() {
  plugins.forEach(p => p.init())
}
