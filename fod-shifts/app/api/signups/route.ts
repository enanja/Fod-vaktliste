export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendAdminNotificationEmail } from '@/lib/email'

// POST - Meld seg på et skift
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn for å melde deg på' },
        { status: 401 }
      )
    }

    const { shiftId, comment } = await request.json()

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Skift-ID er påkrevd' },
        { status: 400 }
      )
    }

    // Hent skiftet med påmeldinger
    const shift = await prisma.shift.findUnique({
      where: { id: parseInt(shiftId) },
      include: {
        signups: true,
      },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Skift ikke funnet' },
        { status: 404 }
      )
    }

    // Sjekk om skiftet er fullt
    if (shift.signups.length >= shift.maxVolunteers) {
      return NextResponse.json(
        { error: 'Dette skiftet er dessverre fullt' },
        { status: 400 }
      )
    }

    // Sjekk om brukeren allerede er påmeldt
    const existingSignup = await prisma.signup.findFirst({
      where: {
        shiftId: parseInt(shiftId),
        userId: session.userId,
      },
    })

    if (existingSignup) {
      return NextResponse.json(
        { error: 'Du er allerede påmeldt dette skiftet' },
        { status: 400 }
      )
    }

    // Opprett påmelding
    const signup = await prisma.signup.create({
      data: {
        shiftId: parseInt(shiftId),
        userId: session.userId,
        comment: comment || null,
      },
      include: {
        shift: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Send epost-notifikasjon til admin (simulert/ekte)
    await sendAdminNotificationEmail({
      volunteerName: signup.user.name,
      volunteerEmail: signup.user.email,
      shiftTitle: signup.shift.title,
      shiftDate: signup.shift.date,
      comment: signup.comment || 'Ingen kommentar',
    })

    return NextResponse.json(
      { message: 'Påmelding vellykket', signup },
      { status: 201 }
    )
  } catch (error: unknown) {
    // Sjekk om det er en Prisma unique constraint error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Du er allerede påmeldt dette skiftet' },
        { status: 400 }
      )
    }

    console.error('Error creating signup:', error)
    return NextResponse.json(
      { error: 'Kunne ikke opprette påmelding' },
      { status: 500 }
    )
  }
}

// GET - Hent brukerens egne påmeldinger
export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn' },
        { status: 401 }
      )
    }

    const signups = await prisma.signup.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          date: 'asc',
        },
      },
    })

    return NextResponse.json(signups)
  } catch (error) {
    console.error('Error fetching signups:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente påmeldinger' },
      { status: 500 }
    )
  }
}
