'use client'

import { useAuth } from '@/lib/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

type FilterOption = 'upcoming' | 'all' | 'past'

type SignupRow = {
  id: number
  createdAt: string
  shift: {
    id: number
    title: string
    type: 'MORGEN' | 'KVELD'
    date: string
    startTime: string | null
    endTime: string | null
  }
  user: {
    id: number
    name: string
    email: string
  }
}

const FILTERS: Array<{ value: FilterOption; label: string }> = [
  { value: 'upcoming', label: 'Fremtidige' },
  { value: 'all', label: 'Alle' },
  { value: 'past', label: 'Historiske' },
]

const SHIFT_TYPE_LABELS: Record<'MORGEN' | 'KVELD', string> = {
  MORGEN: 'Morgenskift',
  KVELD: 'Kveldsskift',
}

export default function AdminSignupsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [rows, setRows] = useState<SignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterOption>('upcoming')

  const fetchSignups = useCallback(async (selectedFilter: FilterOption) => {
    setLoading(true)
    setError('')

    try {
      const query = new URLSearchParams({ filter: selectedFilter })
      const response = await fetch(`/api/admin/signups?${query.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke hente påmeldinger.')
      }

      setRows(data.signups as SignupRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente påmeldinger.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchSignups(filter)
    }
  }, [user, filter, fetchSignups])

  const hasRows = rows.length > 0

  const filterButtons = useMemo(
    () =>
      FILTERS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`${styles.viewButton} ${filter === value ? styles.viewButtonActive : ''}`}
          onClick={() => setFilter(value)}
          aria-pressed={filter === value}
          disabled={loading && filter === value}
        >
          {label}
        </button>
      )),
    [filter, loading]
  )

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
          <h1>Skiftpåmeldinger</h1>
          <p>Oversikt over alle frivillige som er påmeldt skift</p>
        </div>
        <div className={styles.nav}>
          <Link href="/admin" className={styles.buttonSecondary}>
            ← Tilbake til admin-panel
          </Link>
          <button
            className={styles.buttonSecondary}
            onClick={() => fetchSignups(filter)}
            disabled={loading}
          >
            Oppdater liste
          </button>
        </div>
      </header>

      <div className={styles.filtersRow}>
        <span className={styles.filterLabel}>Vis</span>
        <div className={styles.viewSwitch}>{filterButtons}</div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <p>Laster påmeldinger...</p>
      ) : !hasRows ? (
        <p className={styles.empty}>Ingen påmeldinger funnet for valgt filter.</p>
      ) : (
        <div className={styles.volunteersTable}>
          <table>
            <thead>
              <tr>
                <th>Dato</th>
                <th>Skift</th>
                <th>Type</th>
                <th>Tid</th>
                <th>Frivillig</th>
                <th>E-post</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((signup) => {
                const shiftDate = new Date(signup.shift.date)
                const formattedDate = shiftDate.toLocaleDateString('no-NO', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
                const shiftTime = [signup.shift.startTime, signup.shift.endTime]
                  .filter(Boolean)
                  .join(' – ')

                return (
                  <tr key={signup.id}>
                    <td>{formattedDate}</td>
                    <td>{signup.shift.title}</td>
                    <td>{SHIFT_TYPE_LABELS[signup.shift.type]}</td>
                    <td>{shiftTime || '—'}</td>
                    <td>{signup.user.name}</td>
                    <td>{signup.user.email}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
