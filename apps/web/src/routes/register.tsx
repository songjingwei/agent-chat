import { createFileRoute, redirect } from '@tanstack/react-router'
import { useRegister } from '#/features/auth/useRegister'
import { RegisterForm } from '#/features/auth/RegisterForm'

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const registerProps = useRegister()
  return <RegisterForm {...registerProps} />
}
