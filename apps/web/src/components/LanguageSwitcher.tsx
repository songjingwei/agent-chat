import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const langMap: Record<string, { label: string; next: string }> = {
  en: { label: 'EN', next: 'zh' },
  zh: { label: '中', next: 'en' },
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const current = langMap[i18n.language] ?? langMap['en']!

  function toggle() {
    i18n.changeLanguage(current.next)
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
      aria-label={`Switch language to ${current.next === 'zh' ? '中文' : 'English'}`}
    >
      <Globe size={14} />
      {current.label}
    </button>
  )
}
