export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Navn, epost og melding er påkrevd' },
        { status: 400 }
      )
    }

    const trimmedName = String(name).trim()
    const normalizedEmail = String(email).trim().toLowerCase()

    if (!trimmedName || !normalizedEmail) {
      return NextResponse.json(
        { error: 'Ugyldig navn eller epost.' },
        { status: 400 }
      )
    }

    const existingPending = await prisma.volunteerApplication.findFirst({
      where: {
        status: {
          in: ['pending', 'approved'],
        },
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    })

    if (existingPending) {
      return NextResponse.json(
        { error: 'Vi har allerede en aktiv søknad på denne eposten.' },
        { status: 409 }
      )
    }

    const application = await prisma.volunteerApplication.create({
      data: {
        name: trimmedName,
        email: normalizedEmail,
        phone: phone || null,
        message,
      },
    })

    return NextResponse.json({
      message: 'Søknad mottatt',
      application: {
        id: application.id,
        status: application.status,
      },
    })
  } catch (error) {
    console.error('Error creating volunteer application:', error)
    return NextResponse.json(
      { error: 'Kunne ikke sende søknad akkurat nå.' },
      { status: 500 }
    )
  }
}
