import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Valider input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Epost og passord er påkrevd' },
        { status: 400 }
      )
    }

    // Finn brukeren
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Ugyldig epost eller passord' },
        { status: 401 }
      )
    }

    // Sjekk passord
    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Ugyldig epost eller passord' },
        { status: 401 }
      )
    }

    // Opprett session
    const session = await getSession()
    session.userId = user.id
    session.email = user.email
    session.name = user.name
    session.role = user.role as 'admin' | 'volunteer'
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      message: 'Innlogget',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Noe gikk galt ved innlogging' },
      { status: 500 }
    )
  }
}
