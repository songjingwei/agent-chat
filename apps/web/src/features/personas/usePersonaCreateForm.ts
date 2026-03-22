import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreatePersona } from './useCreatePersona'
import { useAuth } from '#/lib/auth-context'

export function usePersonaCreateForm() {
  const { user } = useAuth()
  const [bio, setBio] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [traitInput, setTraitInput] = useState('')

  const navigate = useNavigate()
  const mutation = useCreatePersona()

  const displayName = user?.displayName ?? ''

  function addTrait() {
    const trimmed = traitInput.trim()
    if (!trimmed || traits.length >= 20 || traits.includes(trimmed)) return
    setTraits([...traits, trimmed])
    setTraitInput('')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName) return

    mutation.mutate(
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
    addTrait,
    removeTrait,
    handleTraitKeyDown,
    handleSubmit,
    isPending: mutation.isPending,
    error: mutation.error,
  }
}
