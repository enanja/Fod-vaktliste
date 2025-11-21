/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs";
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { getSession } from '@/lib/session'

const prismaClient = prisma as any

export async function POST(request: Request) {
  try {
    const { email: rawEmail, password } = await request.json()

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''

    // Valider input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Epost og passord er påkrevd' },
        { status: 400 }
      )
    }

    // Finn brukeren
    const user = await prismaClient.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: 'Ugyldig epost eller passord' },
        { status: 401 }
      )
    }

    // Sjekk passord
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Ugyldig epost eller passord' },
        { status: 401 }
      )
    }

    if (user.isBlocked || user.status === 'blocked') {
      return NextResponse.json(
        { error: 'Kontoen din er blokkert. Ta kontakt med FOD for hjelp.' },
        { status: 403 }
      )
    }

    // Opprett session
    const session = await getSession()
    session.userId = user.id
    session.email = user.email
    session.name = user.name
    session.role = user.role as 'ADMIN' | 'FRIVILLIG'
    session.status = user.isBlocked ? 'blocked' : (user.status as 'active' | 'blocked') ?? 'active'
    session.isBlocked = Boolean(user.isBlocked)
    session.isLoggedIn = true
    await session.save()

    return NextResponse.json({
      message: 'Innlogget',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.isBlocked ? 'blocked' : user.status,
        isBlocked: Boolean(user.isBlocked),
        blockedAt: user.blockedAt,
        blockedReason: user.blockedReason,
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
