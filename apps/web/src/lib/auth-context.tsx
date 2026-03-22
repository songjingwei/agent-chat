import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import type { AuthUser } from './types'
import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} from './api-client'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './auth-tokens'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        clearTokens()
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const res = await loginUser({ email, password })
    setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    setUser(res.user)
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ) {
    const res = await registerUser({ email, password, displayName })
    setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    setUser(res.user)
  }

  async function logout() {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await logoutUser({ refreshToken })
      } catch {
        // Ignore logout API errors
      }
    }
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
