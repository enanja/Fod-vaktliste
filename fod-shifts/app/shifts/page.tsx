'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './shifts.module.css'

interface Shift {
  id: number
  title: string
  description: string | null
  date: string
  startTime: string
  endTime: string
  maxVolunteers: number
  signupCount: number
  signups: Array<{
    userId: number
  }>
}

export default function ShiftsPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loadingShifts, setLoadingShifts] = useState(true)
  const [signupModal, setSignupModal] = useState<{
    show: boolean
    shift: Shift | null
  }>({ show: false, shift: null })
  const [comment, setComment] = useState('')
  const [signingUp, setSigningUp] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user?.role === 'admin') {
      router.push('/admin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchShifts()
    }
  }, [user])

  const fetchShifts = async () => {
    try {
      const response = await fetch('/api/shifts')
      const data = await response.json()
      setShifts(data)
    } catch (err) {
      console.error('Error fetching shifts:', err)
    } finally {
      setLoadingShifts(false)
    }
  }

  const openSignupModal = (shift: Shift) => {
    setSignupModal({ show: true, shift })
    setComment('')
    setError('')
  }

  const closeSignupModal = () => {
    setSignupModal({ show: false, shift: null })
    setComment('')
    setError('')
  }

  const handleSignup = async () => {
    if (!signupModal.shift) return

    setSigningUp(true)
    setError('')

    try {
      const response = await fetch('/api/signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: signupModal.shift.id,
          comment,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Påmelding feilet')
      }

      alert('Du er nå påmeldt!')
      closeSignupModal()
      fetchShifts() // Oppdater listen
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setSigningUp(false)
    }
  }

  const isUserSignedUp = (shift: Shift) => {
    return shift.signups.some((signup) => signup.userId === user?.id)
  }

  if (isLoading || !user) {
    return <div className={styles.container}>Laster...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Ledige skift</h1>
          <p>Velkommen, {user.name}!</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/my-shifts">Mine skift</Link>
          <button onClick={() => logout()}>Logg ut</button>
        </nav>
      </header>

      {loadingShifts ? (
        <p>Laster skift...</p>
      ) : shifts.length === 0 ? (
        <p className={styles.empty}>Ingen skift tilgjengelig for øyeblikket.</p>
      ) : (
        <div className={styles.grid}>
          {shifts.map((shift) => {
            const isFull = shift.signupCount >= shift.maxVolunteers
            const isSignedUp = isUserSignedUp(shift)
            const shiftDate = new Date(shift.date)

            return (
              <div key={shift.id} className={styles.card}>
                <h2>{shift.title}</h2>
                {shift.description && (
                  <p className={styles.description}>{shift.description}</p>
                )}
                <div className={styles.details}>
                  <p>
                    📅 {shiftDate.toLocaleDateString('no-NO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p>
                    🕐 {shift.startTime} - {shift.endTime}
                  </p>
                  <p className={isFull ? styles.full : styles.available}>
                    👥 {shift.signupCount} / {shift.maxVolunteers} påmeldt
                    {isFull && ' (FULLT)'}
                  </p>
                </div>
                {isSignedUp ? (
                  <div className={styles.signedUp}>✓ Du er påmeldt</div>
                ) : isFull ? (
                  <button className={styles.buttonDisabled} disabled>
                    Fullt
                  </button>
                ) : (
                  <button
                    className={styles.button}
                    onClick={() => openSignupModal(shift)}
                  >
                    Meld meg på
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Påmeldingsmodal */}
      {signupModal.show && signupModal.shift && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Meld deg på: {signupModal.shift.title}</h2>
            <p>
              {new Date(signupModal.shift.date).toLocaleDateString('no-NO')} kl{' '}
              {signupModal.shift.startTime} - {signupModal.shift.endTime}
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label htmlFor="comment">
                Kommentar (valgfri)
                <br />
                <small>F.eks. spesiell erfaring, allergier, etc.</small>
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                disabled={signingUp}
              />
            </div>

            <div className={styles.modalButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={closeSignupModal}
                disabled={signingUp}
              >
                Avbryt
              </button>
              <button
                className={styles.button}
                onClick={handleSignup}
                disabled={signingUp}
              >
                {signingUp ? 'Melder på...' : 'Bekreft påmelding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
