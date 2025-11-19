import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST() {
  try {
    const session = await getSession()
    session.destroy()

    return NextResponse.json({ message: 'Logget ut' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Noe gikk galt ved utlogging' },
      { status: 500 }
    )
  }
}
