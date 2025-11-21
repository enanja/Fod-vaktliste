'use client'

import { useAuth } from '@/lib/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import styles from './timelog.module.css'

interface TimelogEntry {
  signupId: number
  userId: number
  volunteerName: string
  volunteerEmail: string
  shiftId: number
  shiftTitle: string
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  scheduledHours: number
  workedHours: number | null
  effectiveHours: number
}

interface TimelogTotal {
  userId: number
  volunteerName: string
  volunteerEmail: string
  totalHours: number
}

interface ApiResponse {
  entries: TimelogEntry[]
  totals: TimelogTotal[]
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('no-NO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('no-NO', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHours(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '-'
  }

  return `${value.toFixed(2).replace('.', ',')} t`
}

export default function AdminTimelogPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [from, setFrom] = useState(() => {
    const now = new Date()
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1))
  })
  const [to, setTo] = useState(() => toDateInputValue(new Date()))
  const [entries, setEntries] = useState<TimelogEntry[]>([])
  const [totals, setTotals] = useState<TimelogTotal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (from) {
        params.set('from', from)
      }

      if (to) {
        params.set('to', to)
      }

      const response = await fetch(`/api/timelog?${params.toString()}`)
      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Kunne ikke hente timelogger')
      }

      setEntries(data.entries)
      setTotals(data.totals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente timelogger')
      setEntries([])
      setTotals([])
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
        fetchData()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user])

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams()

    if (from) {
      params.set('from', from)
    }

    if (to) {
      params.set('to', to)
    }

    return `/api/timelog/export?${params.toString()}`
  }, [from, to])

  if (isLoading || !user || user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1>Timelogger</h1>
          <p>Oversikt over faktisk arbeidstid per frivillig</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.push('/admin')}
          >
            Tilbake til admin
          </button>
          <a className={styles.button} href={exportUrl}>
            Eksporter CSV
          </a>
        </div>
      </div>

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault()
          fetchData()
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
        <div className={styles.actions}>
          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? 'Laster…' : 'Oppdater'}
          </button>
        </div>
      </form>

      {error ? <p className={styles.emptyState}>{error}</p> : null}

      {entries.length === 0 && !loading && !error ? (
        <p className={styles.emptyState}>Ingen registrerte timer i perioden.</p>
      ) : null}

      {entries.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>Frivillig</th>
                <th>Dato</th>
                <th>Start</th>
                <th>Slutt</th>
                <th>Planlagt</th>
                <th>Registrert</th>
                <th>Effektiv</th>
                <th>Skift</th>
                <th>Handling</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.signupId}>
                  <td>
                    <div>{entry.volunteerName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{entry.volunteerEmail}</div>
                  </td>
                  <td>{formatDate(entry.shiftDate)}</td>
                  <td>{formatTime(entry.shiftStart)}</td>
                  <td>{formatTime(entry.shiftEnd)}</td>
                  <td>{formatHours(entry.scheduledHours)}</td>
                  <td>{formatHours(entry.workedHours)}</td>
                  <td>{formatHours(entry.effectiveHours)}</td>
                  <td>{entry.shiftTitle}</td>
                  <td>
                    <Link className={styles.secondaryButton} href={`/admin/timelog/${entry.shiftId}`}>
                      Juster
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {totals.length > 0 ? (
        <div className={styles.totalSection}>
          <h2>Totalt per frivillig</h2>
          <ul>
            {totals.map((total) => (
              <li key={total.userId}>
                <span>{total.volunteerName}</span>
                <span>{formatHours(total.totalHours)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
