import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreatePersona } from './useCreatePersona'
import { useBuildPersona } from './useBuildPersona'
import { usePresetTraits, type PresetTrait } from './usePresetTraits'
import { useAuth } from '#/lib/auth-context'

export function usePersonaCreateForm() {
  const { user } = useAuth()
  const [bio, setBio] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [traitInput, setTraitInput] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [showSource, setShowSource] = useState(false)

  const navigate = useNavigate()
  const createMutation = useCreatePersona()
  const buildMutation = useBuildPersona()
  const { presetTraits } = usePresetTraits()

  const displayName = user?.displayName ?? ''

  function addTrait(value?: string) {
    const trimmed = (value ?? traitInput).trim()
    if (!trimmed || traits.length >= 20 || traits.includes(trimmed)) return
    setTraits([...traits, trimmed])
    if (!value) setTraitInput('')
  }

  function togglePresetTrait(preset: PresetTrait) {
    if (traits.includes(preset.value)) {
      removeTrait(preset.value)
    } else {
      addTrait(preset.value)
    }
  }

  function removeTrait(trait: string) {
    setTraits(traits.filter((t) => t !== trait))
  }

  function handleTraitKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTrait()
    }
  }

  function handleBuild() {
    if (!sourceText.trim()) return

    buildMutation.mutate(
      { sourceText: sourceText.trim() },
      {
        onSuccess: () => {
          navigate({ to: '/personas' })
        },
      },
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName) return

    createMutation.mutate(
      {
        displayName,
        bio: bio.trim() || undefined,
        traits,
      },
      {
        onSuccess: () => {
          navigate({ to: '/personas' })
        },
      },
    )
  }

  return {
    displayName,
    bio,
    setBio,
    traits,
    traitInput,
    setTraitInput,
    presetTraits,
    addTrait,
    togglePresetTrait,
    removeTrait,
    handleTraitKeyDown,
    handleSubmit,
    isPending: createMutation.isPending,
    error: createMutation.error,
    // AI build
    sourceText,
    setSourceText,
    showSource,
    setShowSource,
    handleBuild,
    isBuilding: buildMutation.isPending,
    buildError: buildMutation.error,
  }
}
