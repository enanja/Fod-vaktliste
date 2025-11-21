export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { isShiftInPast } from '@/lib/signups'

// GET - Hent alle skift
export async function GET() {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: {
        date: 'asc',
      },
      include: {
        signups: {
          where: {
            status: SignupStatus.CONFIRMED,
          },
          orderBy: {
            createdAt: 'asc',
          },
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
        waitlistEntries: {
          orderBy: {
            createdAt: 'asc',
          },
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

    const formatted = shifts.map((shift) => {
      return {
        id: shift.id,
        title: shift.title,
        description: shift.description,
        notes: shift.notes,
        date: shift.date,
        type: shift.type,
        startTime: shift.startTime,
        endTime: shift.endTime,
        maxVolunteers: shift.maxVolunteers,
        createdAt: shift.createdAt,
        signupCount: shift.signups.length,
        waitlistCount: shift.waitlistEntries.length,
        signups: shift.signups.map((signup) => ({
          id: signup.id,
          userId: signup.user.id,
          comment: signup.comment,
          status: signup.status,
          workedMinutes: signup.workedMinutes,
          attendanceNote: signup.attendanceNote,
          user: signup.user,
        })),
        waitlist: shift.waitlistEntries.map((entry) => ({
          id: entry.id,
          userId: entry.user.id,
          comment: entry.comment,
          createdAt: entry.createdAt,
          user: entry.user,
        })),
        isPast: isShiftInPast(shift),
      }
    })

    return NextResponse.json(formatted)
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

    const { title, description, notes, date, startTime, endTime, maxVolunteers, type } =
      await request.json()

    if (!title || !date || !startTime || !endTime || !maxVolunteers) {
      return NextResponse.json(
        { error: 'Alle påkrevde felt må fylles ut' },
        { status: 400 }
      )
    }

    const shiftType = type === 'KVELD' ? 'KVELD' : 'MORGEN'
    const parsedMax =
      typeof maxVolunteers === 'number' ? maxVolunteers : parseInt(maxVolunteers, 10)
    const safeMax = Number.isNaN(parsedMax) || parsedMax < 1 ? 1 : parsedMax

    const shift = await prisma.shift.create({
      data: {
        title,
        description: description || null,
        notes: notes || null,
        date: new Date(date),
        type: shiftType,
        startTime,
        endTime,
        maxVolunteers: safeMax,
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
