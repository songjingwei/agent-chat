export function buildPlazaSeed(userId?: string, batch = 0) {
  const dayKey = new Date().toISOString().slice(0, 10)
  return `plaza:${userId ?? 'guest'}:${dayKey}:batch:${batch}`
}
