'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../login/login.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sende epost')
      }

      setMessage(
        'Hvis eposten finnes hos oss, sender vi en lenke for å tilbakestille passordet ditt.'
      )
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Glemt passord</h1>
        <p className={styles.subtitle}>
          Skriv inn eposten din, så sender vi deg en lenke for å lage nytt passord.
        </p>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Epost</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className={styles.button}>
            {isSubmitting ? 'Sender lenke...' : 'Send lenke'}
          </button>
        </form>

        <p className={styles.link}>
          Husket passordet? <Link href="/login">Gå til innlogging</Link>
        </p>
      </div>
    </div>
  )
}
