'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'FRIVILLIG'
  status?: 'active' | 'blocked'
  isBlocked?: boolean
  blockedAt?: string | null
  blockedReason?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: { name: string; password: string; email: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      
      if (data.isLoggedIn) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase()

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Innlogging feilet')
    }

    setUser(data.user)
  }

  const register = async ({ name, password, email }: { name: string; password: string; email: string }) => {
    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmedName, password, email: normalizedEmail }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Registrering feilet')
    }

    // Automatisk innlogging etter registrering
    const loginEmail = data?.user?.email ?? normalizedEmail
    await login(loginEmail, password)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth må brukes innenfor AuthProvider')
  }
  return context
}
