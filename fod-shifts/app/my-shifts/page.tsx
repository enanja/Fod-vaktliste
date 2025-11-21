'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '../shifts/shifts.module.css'

type ShiftTypeKey = 'MORGEN' | 'KVELD'

const SHIFT_TYPE_LABELS: Record<ShiftTypeKey, string> = {
  MORGEN: 'Morgenskift',
  KVELD: 'Kveldsskift',
}

interface Signup {
  id: number
  comment: string | null
  createdAt: string
  shift: {
    id: number
    title: string
    description: string | null
    date: string
    startTime: string
    endTime: string
    type: ShiftTypeKey
    notes: string | null
  }
}

export default function MyShiftsPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user?.role === 'ADMIN') {
      router.push('/admin')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchMySignups()
    }
  }, [user])

  const fetchMySignups = async () => {
    try {
      const response = await fetch('/api/signups')
      const data = await response.json()
      setSignups(data)
    } catch (err) {
      console.error('Error fetching signups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (signupId: number) => {
    setCancellingId(signupId)

    try {
      const response = await fetch('/api/signups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Klarte ikke å melde deg av')
      }

      alert('Du er meldt av skiftet.')
      fetchMySignups()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setCancellingId(null)
    }
  }

  const capitalise = (value: string) =>
    value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value

  if (isLoading || !user) {
    return <div className={styles.container}>Laster...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Mine skift</h1>
          <p>{user.name}</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/shifts">Tilbake til skift</Link>
          <button onClick={() => logout()}>Logg ut</button>
        </nav>
      </header>

      {loading ? (
        <p>Laster dine påmeldinger...</p>
      ) : signups.length === 0 ? (
        <div className={styles.empty}>
          <p>Du er ikke påmeldt noen skift ennå.</p>
          <Link href="/shifts" className={styles.button} style={{ display: 'inline-block', marginTop: '16px' }}>
            Se ledige skift
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {signups.map((signup) => {
            const shiftDate = new Date(signup.shift.date)
            const isPast = shiftDate < new Date()

            return (
              <div key={signup.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2>{signup.shift.title}</h2>
                  <span className={styles.shiftTypeBadge}>
                    {SHIFT_TYPE_LABELS[signup.shift.type]}
                  </span>
                </div>
                {signup.shift.description && (
                  <p className={styles.description}>{signup.shift.description}</p>
                )}
                <div className={styles.details}>
                  <p>
                    📅 {capitalise(
                      shiftDate.toLocaleDateString('no-NO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    )}
                  </p>
                  <p>
                    🕐 {signup.shift.startTime} - {signup.shift.endTime}
                  </p>
                  {signup.comment && (
                    <p>
                      💬 <strong>Din kommentar:</strong> {signup.comment}
                    </p>
                  )}
                </div>
                {signup.shift.notes && <p className={styles.notes}>{signup.shift.notes}</p>}
                {isPast ? (
                  <div
                    className={styles.signedUp}
                    style={{ background: '#e2e8f0', color: '#4a5568', border: 'none' }}
                  >
                    Gjennomført
                  </div>
                ) : (
                  <button
                    className={styles.buttonSecondary}
                    onClick={() => handleCancel(signup.id)}
                    disabled={cancellingId === signup.id}
                    style={{ marginTop: '12px' }}
                  >
                    {cancellingId === signup.id ? 'Meldes av...' : 'Meld meg av'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
