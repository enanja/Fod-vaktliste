'use client'

import { useAuth } from '@/lib/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../admin.module.css'

type VolunteerStatus = 'active' | 'blocked' | string

type Volunteer = {
  id: number
  name: string
  email: string
  status: VolunteerStatus
  isBlocked: boolean
  blockedAt: string | null
  blockedReason: string | null
  createdAt: string
}

export default function VolunteersAdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchVolunteers()
    }
  }, [user])

  const fetchVolunteers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/volunteers')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke hente frivillige.')
      }

      setVolunteers(data.volunteers as Volunteer[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente frivillige.')
    } finally {
      setLoading(false)
    }
  }

  const formatStatusLabel = (volunteer: Volunteer) => {
    if (volunteer.isBlocked || volunteer.status === 'blocked') {
      return 'Blokkert'
    }
    return 'Aktiv'
  }

  const sortedVolunteers = useMemo(() => {
    return [...volunteers].sort((a, b) => a.name.localeCompare(b.name))
  }, [volunteers])

  const handleBlockToggle = async (volunteer: Volunteer, action: 'block' | 'unblock') => {
    setProcessingId(volunteer.id)
    setError('')

    try {
      const response = await fetch(`/api/admin/volunteers/${volunteer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oppdatere frivillig.')
      }

      setVolunteers((prev) =>
        prev.map((item) => (item.id === volunteer.id ? { ...item, ...data.volunteer } : item))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere frivillig.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (volunteer: Volunteer) => {
    const confirmed = window.confirm(
      `Er du sikker på at du vil slette ${volunteer.name}? Dette kan ikke angres.`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(volunteer.id)
    setError('')

    try {
      const response = await fetch(`/api/admin/volunteers/${volunteer.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke slette frivillig.')
      }

      setVolunteers((prev) => prev.filter((item) => item.id !== volunteer.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette frivillig.')
    } finally {
      setDeletingId(null)
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
          <h1>Frivillige</h1>
          <p>Administrer status for alle frivillige</p>
        </div>
        <div className={styles.nav}>
          <Link href="/admin" className={styles.buttonSecondary}>
            ← Tilbake til admin-panel
          </Link>
          <button className={styles.buttonSecondary} onClick={fetchVolunteers} disabled={loading}>
            Oppdater liste
          </button>
        </div>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <p>Laster frivillige...</p>
      ) : sortedVolunteers.length === 0 ? (
        <p className={styles.empty}>Ingen frivillige funnet.</p>
      ) : (
        <div className={styles.volunteersTable}>
          <table>
            <thead>
              <tr>
                <th>Navn</th>
                <th>E-post</th>
                <th>Status</th>
                <th>Blokkert siden</th>
                <th>Opprettet</th>
                <th style={{ width: '220px' }}>Handling</th>
              </tr>
            </thead>
            <tbody>
              {sortedVolunteers.map((volunteer) => {
                const isBlocked = volunteer.isBlocked || volunteer.status === 'blocked'
                const statusLabel = formatStatusLabel(volunteer)
                const blockedAt = volunteer.blockedAt
                  ? new Date(volunteer.blockedAt).toLocaleDateString('no-NO')
                  : '—'
                const createdAt = new Date(volunteer.createdAt).toLocaleDateString('no-NO')

                return (
                  <tr key={volunteer.id}>
                    <td>{volunteer.name}</td>
                    <td>{volunteer.email}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          isBlocked ? styles.statusBadgeBlocked : styles.statusBadgeActive
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td>{isBlocked ? blockedAt : '—'}</td>
                    <td>{createdAt}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className={styles.button}
                          disabled={processingId === volunteer.id || isBlocked}
                          onClick={() => handleBlockToggle(volunteer, 'block')}
                        >
                          {processingId === volunteer.id && !isBlocked
                            ? 'Blokkerer...'
                            : 'Blokker'}
                        </button>
                        <button
                          className={styles.buttonSecondary}
                          disabled={processingId === volunteer.id || !isBlocked}
                          onClick={() => handleBlockToggle(volunteer, 'unblock')}
                        >
                          {processingId === volunteer.id && isBlocked
                            ? 'Opphever...'
                            : 'Opphev blokkering'}
                        </button>
                        <button
                          className={styles.buttonDanger}
                          disabled={deletingId === volunteer.id}
                          onClick={() => handleDelete(volunteer)}
                        >
                          {deletingId === volunteer.id ? 'Sletter...' : 'Slett'}
                        </button>
                      </div>
                      {isBlocked && volunteer.blockedReason ? (
                        <div className={styles.metaNote}>Grunn: {volunteer.blockedReason}</div>
                      ) : null}
                    </td>
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
