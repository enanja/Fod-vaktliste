/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const prismaClient = prisma as any

const SHIFT_INCLUDE = {
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
} as const

const formatShiftResponse = (shift: any) => ({
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
  signups: shift.signups.map((signup: any) => ({
    id: signup.id,
    userId: signup.user.id,
    comment: signup.comment,
    status: signup.status,
    workedMinutes: signup.workedMinutes,
    attendanceNote: signup.attendanceNote,
    user: signup.user,
  })),
  waitlist: shift.waitlistEntries.map((entry: any) => ({
    id: entry.id,
    userId: entry.user.id,
    comment: entry.comment,
    createdAt: entry.createdAt,
    user: entry.user,
  })),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const shiftId = Number(id)

    if (Number.isNaN(shiftId)) {
      return NextResponse.json({ error: 'Ugyldig skift-ID' }, { status: 400 })
    }

    const shift = await prismaClient.shift.findUnique({
      where: { id: shiftId },
      include: SHIFT_INCLUDE,
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Skift ikke funnet' },
        { status: 404 }
      )
    }

    return NextResponse.json(formatShiftResponse(shift))
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente skift' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { id } = await context.params
    const shiftId = Number(id)

    if (Number.isNaN(shiftId)) {
      return NextResponse.json({ error: 'Ugyldig skift-ID' }, { status: 400 })
    }

    const {
      title,
      description,
      notes,
      date,
      startTime,
      endTime,
      maxVolunteers,
      type,
    } = await request.json()

    if (!title || !date || !startTime || !endTime || !maxVolunteers) {
      return NextResponse.json(
        { error: 'Alle påkrevde felt må fylles ut' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Ugyldig dato' },
        { status: 400 }
      )
    }

    const parsedMax =
      typeof maxVolunteers === 'number' ? maxVolunteers : parseInt(maxVolunteers, 10)
    const safeMax = Number.isNaN(parsedMax) || parsedMax < 1 ? 1 : parsedMax
    const shiftType = type === 'KVELD' ? 'KVELD' : 'MORGEN'

    const updatedShift = await prismaClient.shift.update({
      where: { id: shiftId },
      data: {
        title,
        description: description || null,
        notes: notes || null,
        date: parsedDate,
        type: shiftType,
        startTime,
        endTime,
        maxVolunteers: safeMax,
      },
      include: SHIFT_INCLUDE,
    })

    return NextResponse.json(formatShiftResponse(updatedShift))
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere skiftet' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { id } = await context.params
    const shiftId = Number(id)

    if (Number.isNaN(shiftId)) {
      return NextResponse.json({ error: 'Ugyldig skift-ID' }, { status: 400 })
    }

    await prismaClient.shift.delete({ where: { id: shiftId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { error: 'Kunne ikke slette skiftet' },
      { status: 500 }
    )
  }
}
