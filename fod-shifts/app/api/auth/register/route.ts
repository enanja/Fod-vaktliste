/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

const prismaClient = prisma as any

export async function GET() {
  return NextResponse.json(
    {
      valid: false,
      error: 'Registrering krever ikke lenger invitasjonslenke. Gå til /register for å opprette konto.',
    },
    { status: 410 }
  )
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Navn, e-post og passord er påkrevd.' },
        { status: 400 }
      )
    }

    const trimmedName = String(name).trim()
    const normalizedEmail = String(email).trim().toLowerCase()

    if (!trimmedName || !normalizedEmail) {
      return NextResponse.json(
        { error: 'Navn og e-post kan ikke være tomme.' },
        { status: 400 }
      )
    }

    const approvedApplication = await prismaClient.volunteerApplication.findFirst({
      where: {
        status: 'approved',
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    })

    if (!approvedApplication) {
      return NextResponse.json(
        {
          error:
            'Denne e-posten er ikke godkjent som frivillig ennå. Send inn søknad først, eller vent på godkjenning fra FOD.',
        },
        { status: 403 }
      )
    }

    const existingUser = await prismaClient.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Det finnes allerede en bruker med denne e-posten.' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prismaClient.$transaction(async (tx: any) => {
      const createdUser = await tx.user.create({
        data: {
          name: trimmedName || approvedApplication.name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          hashedPassword,
          role: 'FRIVILLIG',
          status: 'active',
          isBlocked: false,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      })

      await tx.volunteerApplication.update({
        where: { id: approvedApplication.id },
        data: { status: 'completed' },
      })

      return createdUser
    })

    return NextResponse.json({
      message: 'Bruker opprettet',
      user,
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Noe gikk galt ved registrering' },
      { status: 500 }
    )
  }
}
