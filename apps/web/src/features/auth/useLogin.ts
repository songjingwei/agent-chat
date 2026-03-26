import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth-context'
import { ApiRequestError } from '#/lib/api-client'

export function useLogin() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      await login(identifier, password)
      navigate({ to: '/' })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setIsPending(false)
    }
  }

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    error,
    isPending,
    handleSubmit,
  }
}
