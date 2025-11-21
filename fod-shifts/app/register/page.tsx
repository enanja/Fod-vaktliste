'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../login/login.module.css'

type InviteDetails = {
  email: string
  applicantName?: string | null
}

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(true)

  const { register } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenParam = searchParams.get('token')

  useEffect(() => {
    const currentToken = tokenParam

    if (!currentToken) {
      setInviteError('Denne registreringslenken er ugyldig eller utløpt. Bruk lenken du fikk på e-post, eller kontakt FOD.')
      setInviteLoading(false)
      return
    }

    setInviteLoading(true)
    setInviteError('')
    setToken(currentToken)

    const controller = new AbortController()

    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/auth/register?token=${encodeURIComponent(currentToken)}`, {
          signal: controller.signal,
        })

        const data = await response.json()

        if (!response.ok || !data.valid) {
          const message = data.error || 'Denne registreringslenken er ugyldig eller utløpt. Bruk lenken du fikk på e-post, eller kontakt FOD.'
          setInviteError(message)
          setInviteLoading(false)
          return
        }

        const invite: InviteDetails = data.invite
        setEmail(invite.email)
        setName(invite.applicantName ?? invite.email.split('@')[0])
        setInviteLoading(false)
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          return
        }
        console.error('Invite validation failed:', err)
        setInviteError('Noe gikk galt ved validering av invitasjonen. Prøv igjen senere eller kontakt FOD.')
        setInviteLoading(false)
      }
    }

    fetchInvite()

    return () => {
      controller.abort()
    }
  }, [tokenParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Registreringslenken mangler en gyldig invitasjonstoken.')
      return
    }

    if (inviteError) {
      setError(inviteError)
      return
    }

    setError('')
    setIsLoading(true)

    try {
      await register({ name, password, token, email })
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrering feilet')
    } finally {
      setIsLoading(false)
    }
  }

  const shouldDisableForm = inviteLoading || Boolean(inviteError)

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Registrer deg</h1>
        <p className={styles.subtitle}>Fullfør registreringen din</p>

        {inviteLoading ? <p>Laster invitasjon...</p> : null}

        {inviteError ? <div className={styles.error}>{inviteError}</div> : null}

        {error && <div className={styles.error}>{error}</div>}

        {!shouldDisableForm ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="name">Navn</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Epost</label>
              <input id="email" type="email" value={email} disabled readOnly />
              <small style={{ color: '#4a5568', display: 'block', marginTop: '4px' }}>
                E-posten er låst til invitasjonen din.
              </small>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Passord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading} className={styles.button}>
              {isLoading ? 'Registrerer...' : 'Fullfør registreringen'}
            </button>
          </form>
        ) : null}

        <p className={styles.link}>
          Har du allerede en konto? <Link href="/login">Logg inn her</Link>
        </p>
      </div>
    </div>
  )
}
