export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// GET - Hent alle skift
export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: {
        date: 'asc',
      },
      include: {
        signups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Legg til count av påmeldinger
    const shiftsWithCount = shifts.map((shift) => ({
      ...shift,
      signupCount: shift.signups.length,
    }))

    return NextResponse.json(shiftsWithCount)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente skift' },
      { status: 500 }
    )
  }
}

// POST - Opprett nytt skift (kun admin)
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Ikke autorisert' },
        { status: 403 }
      )
    }

    const { title, description, date, startTime, endTime, maxVolunteers } =
      await request.json()

    // Valider input
    if (!title || !date || !startTime || !endTime || !maxVolunteers) {
      return NextResponse.json(
        { error: 'Alle påkrevde felt må fylles ut' },
        { status: 400 }
      )
    }

    const shift = await prisma.shift.create({
      data: {
        title,
        description: description || null,
        date: new Date(date),
        startTime,
        endTime,
        maxVolunteers: typeof maxVolunteers === 'number' ? maxVolunteers : parseInt(maxVolunteers, 10),
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json(
      { error: 'Kunne ikke opprette skift' },
      { status: 500 }
    )
  }
}
