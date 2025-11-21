'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import styles from './stats.module.css'

interface MonthlyTotal {
  month: string
  hours: number
}

interface ActiveVolunteer {
  userId: number
  volunteerName: string
  volunteerEmail: string
  hours: number
}

interface UnderfilledShift {
  shiftId: number
  title: string
  date: string
  maxVolunteers: number
  confirmedCount: number
  waitlistCount: number
  vacancy: number
}

interface StatsResponse {
  monthlyTotals: MonthlyTotal[]
  activeVolunteers: ActiveVolunteer[]
  underfilledShifts: UnderfilledShift[]
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMonth(value: string) {
  const [year, month] = value.split('-').map((part) => parseInt(part, 10))
  return new Date(year, month - 1, 1).toLocaleDateString('no-NO', {
    year: 'numeric',
    month: 'long',
  })
}

function formatHours(value: number) {
  return `${value.toFixed(2).replace('.', ',')} t`
}

export default function AdminStatsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [from, setFrom] = useState(() => {
    const now = new Date()
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo] = useState(() => toDateInputValue(new Date()))
  const [minHours, setMinHours] = useState(4)
  const [data, setData] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (minHours) params.set('minHours', String(minHours))

      const response = await fetch(`/api/admin/stats?${params.toString()}`)
      const body: StatsResponse | { error?: string } = await response.json()

      if (!response.ok) {
        throw new Error((body as { error?: string }).error || 'Kunne ikke hente statistikk')
      }

      setData(body as StatsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente statistikk')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else if (user.role !== 'ADMIN') {
        router.push('/shifts')
      } else {
        fetchStats()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user])

  const underfilled = useMemo(() => data?.underfilledShifts ?? [], [data])

  if (isLoading || !user || user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1>Statistikk</h1>
          <p>Innsikt basert på registrerte skift og timelogger</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.push('/admin')}
          >
            Tilbake til admin
          </button>
        </div>
      </div>

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault()
          fetchStats()
        }}
      >
        <label>
          Fra dato
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label>
          Til dato
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label>
          Minimum timer per frivillig
          <input
            type="number"
            min={0}
            step={0.5}
            value={minHours}
            onChange={(event) => setMinHours(Number(event.target.value))}
          />
        </label>
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Laster…' : 'Oppdater'}
          </button>
        </div>
      </form>

      {error ? <p className={styles.emptyState}>{error}</p> : null}

      {data ? (
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <h3>Totale timer per måned</h3>
            {data.monthlyTotals.length === 0 ? (
              <p className={styles.emptyState}>Ingen data i valgt periode.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
                {data.monthlyTotals.map((item) => (
                  <li key={item.month} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{formatMonth(item.month)}</span>
                    <span>{formatHours(item.hours)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.statCard}>
            <h3>Aktive frivillige</h3>
            {data.activeVolunteers.length === 0 ? (
              <p className={styles.emptyState}>Ingen frivillige oppfyller grensen.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
                {data.activeVolunteers.map((volunteer) => (
                  <li key={volunteer.userId} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <strong>{volunteer.volunteerName}</strong>
                    <span style={{ fontSize: '12px', color: '#666' }}>{volunteer.volunteerEmail}</span>
                    <span>{formatHours(volunteer.hours)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {underfilled.length > 0 ? (
        <div className={styles.card}>
          <h2>Skift med ledig kapasitet</h2>
          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Skift</th>
                  <th>Maks kapasitet</th>
                  <th>Påmeldte</th>
                  <th>Venteliste</th>
                  <th>Ledige plasser</th>
                </tr>
              </thead>
              <tbody>
                {underfilled.map((shift) => (
                  <tr key={shift.shiftId}>
                    <td>
                      {new Date(shift.date).toLocaleDateString('no-NO', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>{shift.title}</td>
                    <td>{shift.maxVolunteers}</td>
                    <td>{shift.confirmedCount}</td>
                    <td>{shift.waitlistCount}</td>
                    <td>{shift.vacancy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <h2>Skift med ledig kapasitet</h2>
          <p className={styles.emptyState}>Ingen skift med ledige plasser i perioden.</p>
        </div>
      )}
    </div>
  )
}
