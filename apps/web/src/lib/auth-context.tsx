import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
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
import {
  createAnonymousAuthState,
  createAuthenticatedAuthState,
  type AuthState,
  type AuthStatus,
} from './auth-state'

interface AuthContextValue {
  user: AuthState['user']
  status: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  children,
  initialAuth,
}: {
  children: ReactNode
  initialAuth: AuthState
}) {
  const [authState, setAuthState] = useState<AuthState>(initialAuth)
  const [isLoading, setIsLoading] = useState(initialAuth.status === 'unknown')
  const hasAttemptedClientRestore = useRef(false)

  useEffect(() => {
    hasAttemptedClientRestore.current = false
    setAuthState(initialAuth)
    setIsLoading(initialAuth.status === 'unknown')
  }, [
    initialAuth.status,
    initialAuth.user?.createdAt,
    initialAuth.user?.displayName,
    initialAuth.user?.email,
    initialAuth.user?.id,
  ])

  useEffect(() => {
    if (authState.isAuthenticated || hasAttemptedClientRestore.current) {
      return
    }

    const token = getAccessToken()
    if (!token) {
      setIsLoading(false)
      return
    }

    hasAttemptedClientRestore.current = true
    setIsLoading(true)

    let isCancelled = false

    getCurrentUser()
      .then((user) => {
        if (isCancelled) {
          return
        }
        setAuthState(createAuthenticatedAuthState(user))
      })
      .catch(() => {
        if (isCancelled) {
          return
        }
        clearTokens()
        setAuthState(createAnonymousAuthState())
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [authState.isAuthenticated])

  async function login(identifier: string, password: string) {
    const res = await loginUser({ identifier, password })
    setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    setAuthState(createAuthenticatedAuthState(res.user))
    setIsLoading(false)
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ) {
    const res = await registerUser({ email, password, displayName })
    setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    setAuthState(createAuthenticatedAuthState(res.user))
    setIsLoading(false)
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
    setAuthState(createAnonymousAuthState())
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        status: authState.status,
        isLoading,
        isAuthenticated: authState.isAuthenticated,
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
