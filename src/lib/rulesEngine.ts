// ─── RULE ENGINE (DATA-DRIVEN CONFIG) ───────────────────────────

export type Rule<T = any> = {
  key: string
  compute: (input: T, config: any) => any
}

const rules: Record<string, Rule> = {}

export function registerRule(rule: Rule) {
  rules[rule.key] = rule
}

export function runRule(key: string, input: any, config: any) {
  const rule = rules[key]
  if (!rule) throw new Error(`Rule ${key} not found`)
  return rule.compute(input, config)
}
