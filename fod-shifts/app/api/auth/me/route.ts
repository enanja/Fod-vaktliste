import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json({ isLoggedIn: false })
    }

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ isLoggedIn: false })
  }
}
