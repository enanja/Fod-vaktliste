'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Innlogging feilet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Logg inn</h1>
        <p className={styles.subtitle}>FOD Frivillig Skift</p>
        
        <Link href="/apply" className={styles.secondaryButton}>
          Søk om å bli frivillig
        </Link>

        {error && <div className={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Epost</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          <div className={styles.field}>
            <label htmlFor="password">Passord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          
          <button type="submit" disabled={isLoading} className={styles.button}>
            {isLoading ? 'Logger inn...' : 'Logg inn'}
          </button>
        </form>
        
        <p className={styles.link}>
          Glemt passordet? <Link href="/forgot-password">Tilbakestill det her</Link>
        </p>

        <p className={styles.link}>
          Har du ikke en konto? <Link href="/register">Registrer deg her</Link>
        </p>

        <div className={styles.demo}>
          <p><strong>Demo-innlogging:</strong></p>
          <p>Admin: admin@fod.local / Admin123!</p>
        </div>
      </div>
    </div>
  )
}
