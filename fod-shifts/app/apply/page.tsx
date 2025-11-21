'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '../login/login.module.css'

export default function ApplyPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!name || !email || !message) {
      setError('Fyll ut navn, e-post og litt om hvorfor du vil bli frivillig.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sende søknad nå.')
      }

      setSuccess(true)
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke sende søknad nå.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Søk om tilgang</h1>
        <p className={styles.subtitle}>Fortell oss litt om deg selv og hvorfor du vil hjelpe FOD.</p>

        {success ? (
          <div className={styles.success}>
            <p>Takk for søknaden! Du får en e-post når den er behandlet.</p>
            <p>
              Allerede brukerkonto?{' '}
              <Link href="/login">Logg inn her</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error ? <div className={styles.error}>{error}</div> : null}

            <div className={styles.field}>
              <label htmlFor="name">Navn *</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">E-post *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="phone">Telefon</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="message">Hvorfor vil du bli frivillig? *</label>
              <textarea
                id="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                required
                disabled={isSubmitting}
              />
            </div>

            <button type="submit" disabled={isSubmitting} className={styles.button}>
              {isSubmitting ? 'Sender søknad...' : 'Send søknad'}
            </button>
          </form>
        )}

        <p className={styles.link}>
          Tilbake til <Link href="/login">innlogging</Link>
        </p>
      </div>
    </div>
  )
}
