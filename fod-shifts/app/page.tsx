'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import styles from './page.module.css'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect basert på rolle
        if (user.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/shifts')
        }
      } else {
        router.push('/login')
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p>Laster...</p>
        </main>
      </div>
    )
  }

  return null
}
