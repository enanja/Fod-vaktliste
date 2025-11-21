'use client'

import { useAuth } from '@/lib/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import styles from '../timelog.module.css'

interface ShiftSignup {
  id: number
  comment: string | null
  workedMinutes: number | null
  user: {
    id: number
    name: string
    email: string
  }
}

interface ShiftResponse {
  id: number
  title: string
  description: string | null
  notes: string | null
  date: string
  startTime: string
  endTime: string
  signups: ShiftSignup[]
}

interface VolunteerRow {
  signupId: number
  volunteerName: string
  volunteerEmail: string
  plannedHours: number
  workedHours: number | null
  value: string
  saving: boolean
  error: string
}

function calculatePlannedHours(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map((part) => parseInt(part, 10))
  const [endHour, endMinute] = end.split(':').map((part) => parseInt(part, 10))

  if ([startHour, startMinute, endHour, endMinute].some((part) => Number.isNaN(part))) {
    return 0
  }

  const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return diff > 0 ? diff / 60 : 0
}

function normaliseInput(value: string) {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed.length === 0) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? NaN : parsed
}

function toInputValue(hours: number) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2).replace('.', ',')
}

function formatHours(hours: number | null) {
  if (hours === null) {
    return '-'
  }

  return toInputValue(hours)
}

export default function AdminTimelogShiftPage() {
  const { user, isLoading } = useAuth()
  const params = useParams<{ shiftId: string }>()
  const router = useRouter()
  const shiftIdParam = params?.shiftId
  const [shift, setShift] = useState<ShiftResponse | null>(null)
  const [rows, setRows] = useState<VolunteerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!user) {
      router.push('/login')
      return
    }

    if (user.role !== 'ADMIN') {
      router.push('/shifts')
      return
    }

    const shiftId = Number(shiftIdParam)

    if (Number.isNaN(shiftId)) {
      setError('Ugyldig skift-id')
      setLoading(false)
      return
    }

    const loadShift = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`/api/shifts/${shiftId}`)
        const data: ShiftResponse | { error?: string } = await response.json()

        if (!response.ok) {
          throw new Error((data as { error?: string }).error || 'Kunne ikke hente skiftet')
        }

        const shiftData = data as ShiftResponse

        const planned = calculatePlannedHours(shiftData.startTime, shiftData.endTime)

        setShift(shiftData)
        setRows(
          shiftData.signups.map((signup) => {
            const workedHours = signup.workedMinutes === null ? null : signup.workedMinutes / 60
            const value = workedHours ?? planned
            return {
              signupId: signup.id,
              volunteerName: signup.user.name,
              volunteerEmail: signup.user.email,
              plannedHours: planned,
              workedHours,
              value: toInputValue(value),
              saving: false,
              error: '',
            }
          })
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Kunne ikke hente skiftet')
      } finally {
        setLoading(false)
      }
    }

    loadShift()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, shiftIdParam])

  const shiftTitle = useMemo(() => {
    if (!shift) {
      return ''
    }

    const dateLabel = new Date(shift.date).toLocaleDateString('no-NO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return `${shift.title} – ${dateLabel}`
  }, [shift])

  if (isLoading || !user || user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.detailHeader}>
        <div>
          <h1>Juster timer</h1>
          <p>{shiftTitle || 'Skift'}</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.push('/admin/timelog')}
          >
            Tilbake til oversikt
          </button>
        </div>
      </div>

      {loading ? <p>Laster skift...</p> : null}
      {error ? <p className={styles.emptyState}>{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <p className={styles.emptyState}>Ingen frivillige registrert for dette skiftet.</p>
      ) : null}

      {!loading && !error && rows.length > 0 && shift ? (
        <div className={styles.detailCard}>
          <div className={styles.noteText}>
            Standardverdi er beregnet fra skiftets tider ({shift.startTime}–{shift.endTime}).
            Lagre for å overstyre, eller bruk Tilbakestill for å fjerne manuelt oppgitt verdi.
          </div>
          <div className={styles.volunteerHeader}>
            <div>Frivillig</div>
            <div>Beregnet (t)</div>
            <div>Registrert (t)</div>
            <div>Oppdatering</div>
          </div>
          <div className={styles.volunteerList}>
            {rows.map((row) => {
              const baseHours = row.workedHours ?? row.plannedHours
              const parsed = normaliseInput(row.value)
              const isDirty =
                parsed === null
                  ? row.workedHours !== null
                  : !Number.isNaN(parsed) && Math.abs(parsed - baseHours) > 0.01

              return (
                <div key={row.signupId} className={styles.volunteerRow}>
                  <div>
                    <div className={styles.volunteerName}>{row.volunteerName}</div>
                    <div className={styles.volunteerEmail}>{row.volunteerEmail}</div>
                  </div>
                  <div>{formatHours(row.plannedHours)}</div>
                  <div>
                    {formatHours(baseHours)}
                    {row.workedHours !== null ? (
                      <div className={styles.noteText}>Overstyrt</div>
                    ) : null}
                  </div>
                  <div className={styles.inlineActions}>
                    <input
                      className={styles.hoursInput}
                      value={row.value}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setRows((prev) =>
                          prev.map((item) =>
                            item.signupId === row.signupId
                              ? { ...item, value: nextValue, error: '' }
                              : item
                          )
                        )
                      }}
                      placeholder={toInputValue(row.plannedHours)}
                    />
                    <button
                      type="button"
                      className={styles.button}
                      disabled={row.saving || !isDirty}
                      onClick={async () => {
                        const normalised = normaliseInput(row.value)

                        if (Number.isNaN(normalised)) {
                          setRows((prev) =>
                            prev.map((item) =>
                              item.signupId === row.signupId
                                ? { ...item, error: 'Ugyldig tall' }
                                : item
                            )
                          )
                          return
                        }

                        setRows((prev) =>
                          prev.map((item) =>
                            item.signupId === row.signupId
                              ? { ...item, saving: true, error: '' }
                              : item
                          )
                        )

                        try {
                          const response = await fetch(`/api/signups/${row.signupId}/hours`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hours: normalised }),
                          })

                          const data: { workedHours: number | null; effectiveHours: number } & {
                            error?: string
                          } = await response.json()

                          if (!response.ok) {
                            throw new Error(data.error || 'Kunne ikke lagre timer')
                          }

                          setRows((prev) =>
                            prev.map((item) =>
                              item.signupId === row.signupId
                                ? {
                                    ...item,
                                    workedHours: data.workedHours,
                                    value: toInputValue(
                                      data.workedHours === null
                                        ? item.plannedHours
                                        : data.workedHours
                                    ),
                                    saving: false,
                                    error: '',
                                  }
                                : item
                            )
                          )
                        } catch (err) {
                          setRows((prev) =>
                            prev.map((item) =>
                              item.signupId === row.signupId
                                ? {
                                    ...item,
                                    saving: false,
                                    error: err instanceof Error ? err.message : 'Kunne ikke lagre timer',
                                  }
                                : item
                            )
                          )
                        }
                      }}
                    >
                      {row.saving ? 'Lagrer…' : 'Lagre'}
                    </button>
                    <button
                      type="button"
                      className={styles.linkButton}
                      disabled={row.saving || row.workedHours === null}
                      onClick={async () => {
                        setRows((prev) =>
                          prev.map((item) =>
                            item.signupId === row.signupId
                              ? { ...item, saving: true, error: '' }
                              : item
                          )
                        )

                        try {
                          const response = await fetch(`/api/signups/${row.signupId}/hours`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hours: null }),
                          })

                          const data: { workedHours: number | null } & { error?: string } =
                            await response.json()

                          if (!response.ok) {
                            throw new Error(data.error || 'Kunne ikke tilbakestille timer')
                          }

                          setRows((prev) =>
                            prev.map((item) =>
                              item.signupId === row.signupId
                                ? {
                                    ...item,
                                    workedHours: data.workedHours,
                                    value: toInputValue(item.plannedHours),
                                    saving: false,
                                    error: '',
                                  }
                                : item
                            )
                          )
                        } catch (err) {
                          setRows((prev) =>
                            prev.map((item) =>
                              item.signupId === row.signupId
                                ? {
                                    ...item,
                                    saving: false,
                                    error:
                                      err instanceof Error
                                        ? err.message
                                        : 'Kunne ikke tilbakestille timer',
                                  }
                                : item
                            )
                          )
                        }
                      }}
                    >
                      Tilbakestill
                    </button>
                  </div>
                  {row.error ? (
                    <div style={{ gridColumn: '1 / -1', color: '#d8000c', fontSize: '13px' }}>
                      {row.error}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
