import { usePersonaList } from './usePersonaList'
import { getOrCreateUserId } from '#/lib/userId'

export function useMyPersonas() {
  const userId = typeof window !== 'undefined' ? getOrCreateUserId() : ''
  const { personas, isLoading, error, total } = usePersonaList(userId)

  return { personas, total, isLoading, error }
}
