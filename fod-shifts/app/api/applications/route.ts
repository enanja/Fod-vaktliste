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

    const prismaClient = prisma as any // cast needed until Prisma client is regenerated with new models

    const existingPending = await prismaClient.volunteerApplication.findFirst({
      where: {
        email,
        status: {
          in: ['pending', 'approved'],
        },
      },
    })

    if (existingPending) {
      return NextResponse.json(
        { error: 'Vi har allerede en aktiv søknad på denne eposten.' },
        { status: 409 }
      )
    }

    const application = await prismaClient.volunteerApplication.create({
      data: {
        name,
        email,
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
