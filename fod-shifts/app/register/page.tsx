'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/login.module.css'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!trimmedName || !normalizedEmail || !password) {
      setError('Fyll inn navn, e-post og passord.')
      return
    }

    setIsLoading(true)

    try {
      await register({
        name: trimmedName,
        email: normalizedEmail,
        password,
      })
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering feilet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Registrer deg</h1>
        <p className={styles.subtitle}>
          Opprett en konto med e-posten som ble godkjent av FOD.
        </p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">Navn</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Epost</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading}
            />
            <small style={{ color: '#4a5568', display: 'block', marginTop: '4px' }}>
              Bruk samme e-post som i den godkjente søknaden.
            </small>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Passord</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className={styles.button}>
            {isLoading ? 'Registrerer...' : 'Fullfør registreringen'}
          </button>
        </form>

        <p className={styles.link}>
          Har du allerede en konto? <Link href="/login">Logg inn her</Link>
        </p>
        <p className={styles.link}>
          Enda ikke godkjent? <Link href="/apply">Søk om tilgang</Link>
        </p>
      </div>
    </div>
  )
}
