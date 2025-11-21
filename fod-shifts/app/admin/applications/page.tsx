'use client'

import { useAuth } from '@/lib/AuthContext'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../admin.module.css'

type ApplicationStatus = 'pending' | 'approved' | 'rejected'

interface VolunteerApplication {
  id: string
  name: string
  email: string
  phone?: string | null
  message?: string | null
  status: ApplicationStatus
  createdAt: string
  updatedAt: string
}

export default function AdminApplicationsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  const [applications, setApplications] = useState<VolunteerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchApplications()
    }
  }, [user])

  const fetchApplications = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/applications')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke hente søknader.')
      }

      setApplications(data.applications as VolunteerApplication[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke hente søknader.')
    } finally {
      setLoading(false)
    }
  }

  const updateApplication = (updated: VolunteerApplication) => {
    setApplications((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    )
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id)
    setError('')

    try {
      const response = await fetch(`/api/admin/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Kunne ikke oppdatere søknad.')
      }

      updateApplication(data.application)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere søknad.')
    } finally {
      setProcessingId(null)
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
          <h1>Søknader</h1>
          <p>Behandle nye frivilligsøknader</p>
        </div>
        <div className={styles.nav}>
          <Link href="/admin" className={styles.buttonSecondary}>
            ← Tilbake til admin-panel
          </Link>
        </div>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <p>Laster søknader...</p>
      ) : applications.length === 0 ? (
        <p className={styles.empty}>Ingen søknader ennå.</p>
      ) : (
        <div className={styles.volunteersTable}>
          <table>
            <thead>
              <tr>
                <th>Navn</th>
                <th>E-post</th>
                <th>Telefon</th>
                <th>Melding</th>
                <th>Status</th>
                <th>Innsendt</th>
                <th style={{ width: '220px' }}>Handling</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                    <td>{application.name}</td>
                    <td>{application.email}</td>
                    <td>{application.phone || '—'}</td>
                    <td>{application.message || '—'}</td>
                    <td>{application.status}</td>
                    <td>
                      {new Date(application.createdAt).toLocaleString('no-NO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className={styles.button}
                          disabled={processingId === application.id || application.status === 'approved'}
                          onClick={() => handleAction(application.id, 'approve')}
                        >
                          {processingId === application.id && application.status !== 'approved'
                            ? 'Sender e-post...'
                            : 'Godkjenn og send e-post'}
                        </button>
                        <button
                          className={styles.buttonSecondary}
                          disabled={processingId === application.id || application.status === 'rejected'}
                          onClick={() => handleAction(application.id, 'reject')}
                        >
                          {processingId === application.id && application.status !== 'rejected'
                            ? 'Avslår...'
                            : 'Avslå'}
                        </button>
                        {application.status !== 'approved' ? (
                          <span style={{ fontSize: '12px', color: '#4a5568' }}>
                            Godkjenning åpner registrering for søkeren.
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
