import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getPresetTraits } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export interface PresetTrait {
  /** Localized label for display */
  label: string
  /** Localized value to store on the persona */
  value: string
}

export function usePresetTraits() {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'

  const query = useQuery({
    queryKey: queryKeys.personas.presetTraits,
    queryFn: () => getPresetTraits(),
    staleTime: 5 * 60 * 1000,
  })

  const presetTraits: PresetTrait[] = (query.data?.traits ?? []).map((t) => ({
    label: t[lang] || t.en,
    value: t[lang] || t.en,
  }))

  return {
    presetTraits,
    isLoading: query.isLoading,
  }
}
