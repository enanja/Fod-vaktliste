'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './shifts.module.css'

type ShiftTypeKey = 'MORGEN' | 'KVELD'
type ViewMode = 'calendar' | 'list'

const SHIFT_TYPES: ShiftTypeKey[] = ['MORGEN', 'KVELD']
const SHIFT_TYPE_LABELS: Record<ShiftTypeKey, string> = {
  MORGEN: 'Morgenskift',
  KVELD: 'Kveldsskift',
}
const WEEKDAY_LABELS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']

interface Shift {
  id: number
  title: string
  description: string | null
  notes: string | null
  date: string
  startTime: string
  endTime: string
  type: ShiftTypeKey
  maxVolunteers: number
  signupCount: number
  signups: Array<{
    id: number
    userId: number
    comment: string | null
    status: 'CONFIRMED' | 'CANCELLED'
    user: {
      id: number
      name: string
      email: string
    }
  }>
  waitlistCount: number
  waitlist: Array<{
    id: number
    userId: number
    comment: string | null
    createdAt: string
    user: {
      id: number
      name: string
      email: string
    }
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
  const [waitlistBusy, setWaitlistBusy] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user?.role === 'ADMIN') {
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
      const data: Shift[] = await response.json()
      setShifts(data)
    } catch (err) {
      console.error('Error fetching shifts:', err)
    } finally {
      setLoadingShifts(false)
    }
  }

  const monthLabel = currentMonth.toLocaleDateString('no-NO', {
    month: 'long',
    year: 'numeric',
  })

  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`

  const capitalise = (value: string) =>
    value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Partial<Record<ShiftTypeKey, Shift>>>()
    shifts.forEach((shift) => {
      const key = shift.date.slice(0, 10)
      const entry = map.get(key) ?? {}
      entry[shift.type] = shift
      map.set(key, entry)
    })
    return map
  }, [shifts])

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const offset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate()

    const days: Array<Date | null> = []
    for (let i = 0; i < offset; i += 1) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    return days
  }, [currentMonth])

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  const formatDateLong = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('no-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

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

  const handleJoinWaitlist = async (shift: Shift) => {
    setWaitlistBusy(shift.id)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: shift.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sette deg på ventelisten')
      }

      alert('Du er satt på ventelisten.')
      fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setWaitlistBusy(null)
    }
  }

  const handleLeaveWaitlist = async (shift: Shift) => {
    setWaitlistBusy(shift.id)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId: shift.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke fjerne deg fra ventelisten')
      }

      alert('Du er fjernet fra ventelisten.')
      fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setWaitlistBusy(null)
    }
  }

  const isUserSignedUp = (shift: Shift) => {
    return shift.signups.some((signup) => signup.userId === user?.id)
  }

  const isUserWaitlisted = (shift: Shift) => {
    return shift.waitlist.some((entry) => entry.userId === user?.id)
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
        <div className={styles.content}>
          <div className={styles.viewSwitch}>
            <button
              type="button"
              className={`${styles.viewButton} ${
                viewMode === 'calendar' ? styles.viewButtonActive : ''
              }`}
              onClick={() => handleViewChange('calendar')}
              aria-pressed={viewMode === 'calendar'}
            >
              Kalender
            </button>
            <button
              type="button"
              className={`${styles.viewButton} ${
                viewMode === 'list' ? styles.viewButtonActive : ''
              }`}
              onClick={() => handleViewChange('list')}
              aria-pressed={viewMode === 'list'}
            >
              Liste
            </button>
          </div>

          {viewMode === 'calendar' ? (
            <>
              <div className={styles.calendarWrapper}>
                <div className={styles.calendarHeader}>
                  <button
                    type="button"
                    className={styles.calendarNavButton}
                    onClick={goToPrevMonth}
                    aria-label="Forrige måned"
                  >
                    ‹
                  </button>
                  <h2>{capitalise(monthLabel)}</h2>
                  <button
                    type="button"
                    className={styles.calendarNavButton}
                    onClick={goToNextMonth}
                    aria-label="Neste måned"
                  >
                    ›
                  </button>
                </div>

                <div className={styles.calendarWeekdays}>
                  {WEEKDAY_LABELS.map((day) => (
                    <div key={day} className={styles.calendarWeekday}>
                      {day}
                    </div>
                  ))}
                </div>

                <div className={styles.calendarGrid}>
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className={`${styles.calendarCell} ${styles.calendarCellEmpty}`}
                        />
                      )
                    }

                    const dateKey = toDateKey(day)
                    const dayShifts = shiftsByDate.get(dateKey)

                    return (
                      <div key={dateKey} className={styles.calendarCell}>
                        <div className={styles.calendarCellHeader}>
                          <span className={styles.calendarDayNumber}>{day.getDate()}</span>
                          <span className={styles.calendarDayMonth}>
                            {day.toLocaleDateString('no-NO', { month: 'short' })}
                          </span>
                        </div>

                        <div className={styles.calendarCellShifts}>
                          {SHIFT_TYPES.map((shiftType) => {
                            const shift = dayShifts?.[shiftType] ?? null
                            const isFull =
                              shift !== null && shift.signupCount >= shift.maxVolunteers
                            const isSigned = shift ? isUserSignedUp(shift) : false
                            const isWaitlisted = shift ? isUserWaitlisted(shift) : false
                            const classNames = [styles.calendarShift]

                            if (!shift) {
                              classNames.push(styles.calendarShiftEmpty)
                            } else if (isWaitlisted) {
                              classNames.push(styles.calendarShiftWaitlisted)
                            } else if (isSigned) {
                              classNames.push(styles.calendarShiftMine)
                            } else if (isFull) {
                              classNames.push(styles.calendarShiftFull)
                            } else {
                              classNames.push(styles.calendarShiftAvailable)
                            }

                            const disabled =
                              !shift || waitlistBusy === shift.id || isSigned

                            return (
                              <button
                                key={shiftType}
                                type="button"
                                className={classNames.join(' ')}
                                onClick={() => {
                                  if (!shift || waitlistBusy === shift.id) return

                                  if (isSigned) {
                                    return
                                  }

                                  if (isWaitlisted) {
                                    handleLeaveWaitlist(shift)
                                    return
                                  }

                                  if (isFull) {
                                    handleJoinWaitlist(shift)
                                    return
                                  }

                                  openSignupModal(shift)
                                }}
                                disabled={disabled}
                                title={
                                  shift
                                    ? `${SHIFT_TYPE_LABELS[shiftType]} · ${shift.startTime}–${shift.endTime} · ${shift.signupCount}/${shift.maxVolunteers} påmeldt · Venteliste: ${shift.waitlistCount}` +
                                      (isSigned
                                        ? ' · Du er påmeldt'
                                        : isWaitlisted
                                          ? ' · Du står på ventelisten'
                                          : isFull
                                            ? ' · Fullt'
                                            : '')
                                    : 'Ingen skift'
                                }
                              >
                                <span className={styles.shiftLabel}>
                                  {SHIFT_TYPE_LABELS[shiftType]}
                                </span>
                                {shift ? (
                                  <>
                                    <span className={styles.shiftTitle}>{shift.title}</span>
                                    <span className={styles.shiftTime}>
                                      {shift.startTime}–{shift.endTime}
                                    </span>
                                    <span className={styles.shiftCount}>
                                      {shift.signupCount}/{shift.maxVolunteers}
                                    </span>
                                  </>
                                ) : (
                                  <span className={styles.shiftEmptyText}>Ingen skift</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={styles.calendarLegend}>
                <span className={`${styles.legendItem} ${styles.legendAvailable}`}>
                  Ledig
                </span>
                <span className={`${styles.legendItem} ${styles.legendFull}`}>Fullt</span>
                <span className={`${styles.legendItem} ${styles.legendWaitlist}`}>
                  Venteliste
                </span>
                <span className={`${styles.legendItem} ${styles.legendMine}`}>
                  Du er påmeldt
                </span>
              </div>

              <p className={styles.calendarHint}>
                Klikk på et ledig skift for å melde deg på.
              </p>
            </>
          ) : (
            <div className={styles.grid}>
              {shifts.map((shift) => {
                const isFull = shift.signupCount >= shift.maxVolunteers
                const isSignedUp = isUserSignedUp(shift)
                const isWaitlisted = isUserWaitlisted(shift)

                return (
                  <div key={shift.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <h2>{shift.title}</h2>
                      <span className={styles.shiftTypeBadge}>
                        {SHIFT_TYPE_LABELS[shift.type]}
                      </span>
                    </div>
                    {shift.description && (
                      <p className={styles.description}>{shift.description}</p>
                    )}
                    <div className={styles.details}>
                      <p>📅 {capitalise(formatDateLong(shift.date))}</p>
                      <p>🕐 {shift.startTime} - {shift.endTime}</p>
                      <p className={isFull ? styles.full : styles.available}>
                        👥 {shift.signupCount} / {shift.maxVolunteers} påmeldt
                        {isFull && ' (FULLT)'}
                      </p>
                      <p>
                        ⏳ Venteliste: {shift.waitlistCount}
                      </p>
                    </div>
                    {shift.notes && <p className={styles.notes}>{shift.notes}</p>}
                    {isSignedUp ? (
                      <div className={styles.signedUp}>✓ Du er påmeldt</div>
                    ) : isWaitlisted ? (
                      <>
                        <div className={styles.waitlisted}>⏳ Du står på ventelisten</div>
                        <button
                          className={styles.buttonSecondary}
                          onClick={() => handleLeaveWaitlist(shift)}
                          disabled={waitlistBusy === shift.id}
                          style={{ marginTop: '12px', width: '100%' }}
                        >
                          {waitlistBusy === shift.id ? 'Fjerner...' : 'Fjern meg fra ventelisten'}
                        </button>
                      </>
                    ) : isFull ? (
                      <button
                        className={styles.buttonSecondary}
                        onClick={() => handleJoinWaitlist(shift)}
                        disabled={waitlistBusy === shift.id}
                        style={{ marginTop: '12px', width: '100%' }}
                      >
                        {waitlistBusy === shift.id ? 'Legger til...' : 'Sett meg på venteliste'}
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
