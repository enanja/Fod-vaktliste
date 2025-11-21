
'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import styles from './admin.module.css'

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

interface FormState {
  title: string
  description: string
  notes: string
  date: string
  startTime: string
  endTime: string
  maxVolunteers: number
  type: ShiftTypeKey
}

type ShiftsByType = Partial<Record<ShiftTypeKey, Shift>>

export default function AdminPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [reminderStatus, setReminderStatus] = useState('')
  const [sendingReminders, setSendingReminders] = useState(false)

  const [formData, setFormData] = useState<FormState>(
    () => ({
      title: '',
      description: '',
      notes: '',
      date: '',
      startTime: '',
      endTime: '',
      maxVolunteers: 5,
      type: 'MORGEN',
    })
  )
  const [removingSignupId, setRemovingSignupId] = useState<number | null>(null)
  const [removingWaitlistId, setRemovingWaitlistId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user && user.role !== 'ADMIN') {
      router.push('/shifts')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchShifts()
    }
  }, [user])

  const fetchShifts = async () => {
    try {
      const response = await fetch('/api/shifts')
      const data: Shift[] = await response.json()
      setShifts(data)
      setSelectedShift((prev) => (prev ? data.find((item: Shift) => item.id === prev.id) ?? null : null))
    } catch (err) {
      console.error('Error fetching shifts:', err)
    } finally {
      setLoading(false)
    }
  }

  const monthLabel = currentMonth.toLocaleDateString('no-NO', {
    month: 'long',
    year: 'numeric',
  })

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftsByType>()
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
    const offset = (firstDay.getDay() + 6) % 7 // Start uken på mandag
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

  const formatDateLong = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString('no-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`

  const capitalise = (value: string) =>
    value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value

  const renderSignupTable = (shift: Shift) => (
    <div className={styles.volunteersTable}>
      <h4>Påmeldte</h4>
      {shift.signups.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>E-post</th>
              <th>Kommentar</th>
              <th style={{ width: '120px' }}>Handling</th>
            </tr>
          </thead>
          <tbody>
            {shift.signups.map((signup) => (
              <tr key={signup.id}>
                <td>{signup.user.name}</td>
                <td>{signup.user.email}</td>
                <td>{signup.comment || '-'}</td>
                <td>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => handleRemoveSignup(signup.id)}
                    disabled={removingSignupId === signup.id}
                  >
                    {removingSignupId === signup.id ? 'Fjerner…' : 'Fjern'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noSignups}>Ingen påmeldte.</p>
      )}

      <h4>Venteliste ({shift.waitlistCount})</h4>
      {shift.waitlist.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>E-post</th>
              <th>Kommentar</th>
              <th>Registrert</th>
              <th style={{ width: '120px' }}>Handling</th>
            </tr>
          </thead>
          <tbody>
            {shift.waitlist.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.user.name}</td>
                <td>{entry.user.email}</td>
                <td>{entry.comment || '-'}</td>
                <td>
                  {new Date(entry.createdAt).toLocaleString('no-NO', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => handleRemoveWaitlistEntry(entry.id)}
                    disabled={removingWaitlistId === entry.id}
                  >
                    {removingWaitlistId === entry.id ? 'Fjerner…' : 'Fjern'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.noSignups}>Ingen på venteliste.</p>
      )}
    </div>
  )

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode === 'calendar') {
      setSelectedShift(null)
    }
  }

  const handleSendReminders = async () => {
    setSendingReminders(true)
    setReminderStatus('')

    try {
      const response = await fetch('/api/admin/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke sende påminnelser')
      }

      setReminderStatus(`Sendte ${data.sent} påminnelser. Hoppet over ${data.skipped}.`)
    } catch (err) {
      setReminderStatus(err instanceof Error ? err.message : 'Kunne ikke sende påminnelser')
    } finally {
      setSendingReminders(false)
    }
  }

  const handleRemoveSignup = async (signupId: number) => {
    setRemovingSignupId(signupId)

    try {
      const response = await fetch('/api/signups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke fjerne frivillig fra skiftet')
      }

      fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt ved fjerning av frivillig')
    } finally {
      setRemovingSignupId(null)
    }
  }

  const handleRemoveWaitlistEntry = async (entryId: number) => {
    setRemovingWaitlistId(entryId)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke fjerne frivillig fra ventelisten')
      }

      fetchShifts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noe gikk galt ved fjerning fra ventelisten')
    } finally {
      setRemovingWaitlistId(null)
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const payload = {
        ...formData,
        maxVolunteers:
          Number.isNaN(formData.maxVolunteers) || formData.maxVolunteers < 1
            ? 1
            : formData.maxVolunteers,
      }

      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke opprette skift')
      }

      alert('Skift opprettet!')
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        notes: '',
        date: '',
        startTime: '',
        endTime: '',
        maxVolunteers: 5,
        type: 'MORGEN',
      })
      fetchShifts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setCreating(false)
    }
  }

  if (isLoading || !user) {
    return <div className={styles.container}>Laster...</div>
  }

  if (user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Admin-panel</h1>
          <p>Velkommen, {user.name}</p>
        </div>
        <div className={styles.nav}>
          <button className={styles.button} onClick={() => setShowCreateModal(true)}>
            + Opprett nytt skift
          </button>
          <button className={styles.buttonSecondary} onClick={() => router.push('/admin/timelog')}>
            Timelogger
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={() => router.push('/admin/stats')}
          >
            Statistikk
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={handleSendReminders}
            disabled={sendingReminders}
            title="Sender e-postpåminnelser til frivillige som har skift om 24 timer"
          >
            {sendingReminders ? 'Sender…' : 'Send påminnelser'}
          </button>
          <button className={styles.buttonSecondary} onClick={() => logout()}>
            Logg ut
          </button>
        </div>
      </header>

      {reminderStatus ? <p style={{ marginBottom: '16px' }}>{reminderStatus}</p> : null}

      {loading ? (
        <p>Laster skift...</p>
      ) : (
        <div className={styles.shiftsContainer}>
          <div className={styles.shiftsHeader}>
            <h2>Planlagte skift</h2>
            {shifts.length > 0 && (
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
            )}
          </div>

          {shifts.length === 0 ? (
            <p className={styles.empty}>Ingen skift opprettet ennå.</p>
          ) : viewMode === 'calendar' ? (
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
                  <h3>{capitalise(monthLabel)}</h3>
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
                            const classNames = [styles.calendarShift]

                            if (!shift) {
                              classNames.push(styles.calendarShiftEmpty)
                            } else if (isFull) {
                              classNames.push(styles.calendarShiftFull)
                            } else {
                              classNames.push(styles.calendarShiftAvailable)
                            }

                            return (
                              <button
                                key={shiftType}
                                type="button"
                                className={classNames.join(' ')}
                                onClick={() => shift && setSelectedShift(shift)}
                                disabled={!shift}
                              >
                                <span className={styles.shiftLabel}>
                                  {SHIFT_TYPE_LABELS[shiftType]}
                                </span>
                                {shift ? (
                                  <>
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
              </div>

              {selectedShift ? (
                <div className={styles.selectedShiftCard}>
                  <div className={styles.selectedShiftHeader}>
                    <div>
                      <h3>{selectedShift.title}</h3>
                      <p>
                        {capitalise(formatDateLong(selectedShift.date))} ·{' '}
                        {SHIFT_TYPE_LABELS[selectedShift.type]} · {selectedShift.startTime}–
                        {selectedShift.endTime}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => setSelectedShift(null)}
                    >
                      Lukk
                    </button>
                  </div>
                  {selectedShift.notes && (
                    <p className={styles.notes}>{selectedShift.notes}</p>
                  )}
                  <p className={styles.selectedShiftCount}>
                    {selectedShift.signupCount} / {selectedShift.maxVolunteers} påmeldt
                  </p>
                  <p className={styles.selectedShiftWaitlist}>
                    Venteliste: {selectedShift.waitlistCount}
                  </p>
                  {renderSignupTable(selectedShift)}
                </div>
              ) : (
                <p className={styles.calendarHint}>
                  Klikk på et skift i kalenderen for å se påmeldte frivillige.
                </p>
              )}
            </>
          ) : (
            <div className={styles.shiftsList}>
              {shifts.map((shift) => {
                const isFull = shift.signupCount >= shift.maxVolunteers
                const isExpanded = selectedShift?.id === shift.id

                return (
                  <div key={shift.id} className={styles.shiftCard}>
                    <div className={styles.shiftHeader}>
                      <div>
                        <div className={styles.shiftTitleRow}>
                          <h3>{shift.title}</h3>
                          <span className={styles.shiftTypeBadge}>
                            {SHIFT_TYPE_LABELS[shift.type]}
                          </span>
                        </div>
                        <p className={styles.date}>
                          {capitalise(formatDateLong(shift.date))} · {shift.startTime}–
                          {shift.endTime}
                        </p>
                        {shift.description && (
                          <p className={styles.description}>{shift.description}</p>
                        )}
                        {shift.notes && <p className={styles.notes}>{shift.notes}</p>}
                      </div>
                      <div className={styles.shiftStats}>
                        <span className={isFull ? styles.full : styles.available}>
                          {shift.signupCount} / {shift.maxVolunteers} påmeldt
                        </span>
                        <span className={styles.waitlistStat}>
                          Venteliste: {shift.waitlistCount}
                        </span>
                      </div>
                    </div>

                    {shift.signupCount > 0 || shift.waitlistCount > 0 ? (
                      <div className={styles.signupsList}>
                        <button
                          className={styles.toggleButton}
                          onClick={() => setSelectedShift(isExpanded ? null : shift)}
                        >
                          {isExpanded ? '▼' : '▶'} Se påmeldte ({shift.signupCount}) / venteliste ({shift.waitlistCount})
                        </button>

                        {isExpanded && renderSignupTable(shift)}
                      </div>
                    ) : (
                      <p className={styles.noSignups}>Ingen påmeldte eller venteliste.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Opprett nytt skift</h2>

            {error && <div className={styles.error}>{error}</div>}

            <form onSubmit={handleCreateShift} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="title">Tittel *</label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={creating}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="type">Skifttype *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as ShiftTypeKey })
                  }
                  required
                  disabled={creating}
                >
                  <option value="MORGEN">Morgen</option>
                  <option value="KVELD">Kveld</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="date">Dato *</label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  disabled={creating}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="description">Beskrivelse</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  disabled={creating}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes">Interne notater</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  disabled={creating}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="startTime">Starttid *</label>
                  <input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                    disabled={creating}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="endTime">Sluttid *</label>
                  <input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    required
                    disabled={creating}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="maxVolunteers">Maks antall frivillige *</label>
                <input
                  id="maxVolunteers"
                  type="number"
                  min="1"
                  value={formData.maxVolunteers}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10)
                    setFormData({
                      ...formData,
                      maxVolunteers: Number.isNaN(value) ? 1 : Math.max(1, value),
                    })
                  }}
                  required
                  disabled={creating}
                />
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Avbryt
                </button>
                <button type="submit" className={styles.button} disabled={creating}>
                  {creating ? 'Oppretter...' : 'Opprett skift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
