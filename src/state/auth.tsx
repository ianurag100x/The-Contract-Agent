import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export type UserRole = 'agent' | 'admin'

export interface User {
  id: string
  name: string
  role: UserRole
  tornId: number
  apiKeyMasked?: string
  avatarUrl?: string
}

export const DEMO_PERSONAS: Record<UserRole, User> = {
  agent: {
    id: 'user-agent-1',
    name: 'Anurag',
    role: 'agent',
    tornId: 2849102,
    apiKeyMasked: 'torn_api_••••••••••••92a1',
  },
  admin: {
    id: 'user-admin-1',
    name: 'Admin Overseer',
    role: 'admin',
    tornId: 1000001,
    apiKeyMasked: 'torn_api_••••••••••••root',
  },
}

const STORAGE_KEY = 'contract-agent:auth-user'

interface AuthContextType {
  user: User | null
  login: (userOrRole: User | UserRole, apiKey?: string) => void
  logout: () => void
  switchRole: (role: UserRole) => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as User
      }
    } catch {
      // ignore storage errors
    }
    // Default to logged-in demo agent for seamless exploration
    return DEMO_PERSONAS.agent
  })

  const login = (userOrRole: User | UserRole, apiKey?: string) => {
    let nextUser: User
    if (typeof userOrRole === 'string') {
      nextUser = DEMO_PERSONAS[userOrRole]
    } else {
      nextUser = userOrRole
    }

    if (apiKey) {
      nextUser = {
        ...nextUser,
        apiKeyMasked: `torn_api_••••••••••••${apiKey.slice(-4) || 'live'}`,
      }
    }

    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    } catch {
      // ignore storage errors
    }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const switchRole = (role: UserRole) => {
    login(role)
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    switchRole,
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="grid size-12 place-items-center rounded-2xl border border-line bg-raised text-hard">
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Access Restricted</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">
          The Admin Panel is reserved for Overseers and Contract Administrators. Please switch to an Administrator persona to manage contracts.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
