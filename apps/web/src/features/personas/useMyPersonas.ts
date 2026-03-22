import { usePersonaList } from './usePersonaList'

export function useMyPersonas() {
  const { personas, isLoading, error } = usePersonaList()
  return { personas, isLoading, error }
}
