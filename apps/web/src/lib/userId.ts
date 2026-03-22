const STORAGE_KEY = 'agent-chat-user-id'

function generateId(): string {
  return crypto.randomUUID()
}

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const id = generateId()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}
