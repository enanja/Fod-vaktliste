export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    // Valider input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Alle felt er påkrevd' },
        { status: 400 }
      )
    }

    // Sjekk om brukeren allerede eksisterer
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'En bruker med denne eposten eksisterer allerede' },
        { status: 400 }
      )
    }

    // Hash passord
    const hashedPassword = await bcrypt.hash(password, 10)

    // Opprett bruker
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: 'FRIVILLIG', // Alle nye brukere er frivillige
      },
    })

    return NextResponse.json({
      message: 'Bruker opprettet',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Noe gikk galt ved registrering' },
      { status: 500 }
    )
  }
}
