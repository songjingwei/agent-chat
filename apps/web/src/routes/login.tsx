import { createFileRoute, redirect } from '@tanstack/react-router'
import { useLogin } from '#/features/auth/useLogin'
import { LoginForm } from '#/features/auth/LoginForm'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const loginProps = useLogin()
  return <LoginForm {...loginProps} />
}
