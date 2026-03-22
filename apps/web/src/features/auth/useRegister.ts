import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '#/lib/auth-context'
import { ApiRequestError } from '#/lib/api-client'

export function useRegister() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('密码不一致，请重新输入。')
      return
    }

    setIsPending(true)

    try {
      await register(email, password, displayName)
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
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    isPending,
    handleSubmit,
  }
}
