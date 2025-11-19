'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './admin.module.css'

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
    id: number
    comment: string | null
    user: {
      id: number
      name: string
      email: string
    }
  }>
}

export default function AdminPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    maxVolunteers: 5,
  })

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (user && user.role !== 'admin') {
      router.push('/shifts')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && user.role === 'admin') {
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
      setLoading(false)
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      const response = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        date: '',
        startTime: '',
        endTime: '',
        maxVolunteers: 5,
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

  if (user.role !== 'admin') {
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
          <button className={styles.buttonSecondary} onClick={() => logout()}>
            Logg ut
          </button>
        </div>
      </header>

      {loading ? (
        <p>Laster skift...</p>
      ) : (
        <div className={styles.shiftsContainer}>
          <h2>Alle skift</h2>
          {shifts.length === 0 ? (
            <p className={styles.empty}>Ingen skift opprettet ennå.</p>
          ) : (
            <div className={styles.shiftsList}>
              {shifts.map((shift) => {
                const shiftDate = new Date(shift.date)
                const isFull = shift.signupCount >= shift.maxVolunteers

                return (
                  <div key={shift.id} className={styles.shiftCard}>
                    <div className={styles.shiftHeader}>
                      <div>
                        <h3>{shift.title}</h3>
                        <p className={styles.date}>
                          {shiftDate.toLocaleDateString('no-NO', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}{' '}
                          kl {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                      <div className={styles.shiftStats}>
                        <span className={isFull ? styles.full : styles.available}>
                          {shift.signupCount} / {shift.maxVolunteers} påmeldt
                        </span>
                      </div>
                    </div>

                    {shift.signupCount > 0 && (
                      <div className={styles.signupsList}>
                        <button
                          className={styles.toggleButton}
                          onClick={() =>
                            setSelectedShift(selectedShift?.id === shift.id ? null : shift)
                          }
                        >
                          {selectedShift?.id === shift.id ? '▼' : '▶'} Se påmeldte (
                          {shift.signupCount})
                        </button>

                        {selectedShift?.id === shift.id && (
                          <div className={styles.volunteersTable}>
                            <table>
                              <thead>
                                <tr>
                                  <th>Navn</th>
                                  <th>Epost</th>
                                  <th>Kommentar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {shift.signups.map((signup) => (
                                  <tr key={signup.id}>
                                    <td>{signup.user.name}</td>
                                    <td>{signup.user.email}</td>
                                    <td>{signup.comment || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
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
                  onChange={(e) =>
                    setFormData({ ...formData, maxVolunteers: parseInt(e.target.value) })
                  }
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
