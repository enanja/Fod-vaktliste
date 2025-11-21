export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { Prisma, SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendAdminSignupNotificationEmail } from '@/lib/email'
import { isShiftInPast } from '@/lib/signups'

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn for å bruke ventelisten' },
        { status: 401 }
      )
    }

    if (session.isBlocked || session.status === 'blocked') {
      return NextResponse.json(
        { error: 'Du har ikke lenger tilgang til ventelisten.' },
        { status: 403 }
      )
    }

    const { shiftId, comment } = await request.json()
    const shiftIdNumber = typeof shiftId === 'number' ? shiftId : parseInt(shiftId, 10)

    if (!shiftId || Number.isNaN(shiftIdNumber)) {
      return NextResponse.json(
        { error: 'Ugyldig skift-ID' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findUnique({
        where: { id: shiftIdNumber },
        include: {
          signups: {
            where: {
              status: SignupStatus.CONFIRMED,
            },
            select: {
              userId: true,
            },
          },
        },
      })

      if (!shift) {
        throw new Error('SHIFT_NOT_FOUND')
      }

      if (isShiftInPast(shift)) {
        throw new Error('SHIFT_IN_PAST')
      }

      if (shift.signups.length < shift.maxVolunteers) {
        throw new Error('SHIFT_HAS_CAPACITY')
      }

      const existingSignup = await tx.signup.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: session.userId,
          },
        },
      })

      if (existingSignup && existingSignup.status === SignupStatus.CONFIRMED) {
        throw new Error('ALREADY_SIGNED')
      }

      const existingEntry = await tx.waitlistEntry.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: session.userId,
          },
        },
      })

      if (existingEntry) {
        throw new Error('ALREADY_WAITLISTED')
      }

      const entry = await tx.waitlistEntry.create({
        data: {
          shiftId: shiftIdNumber,
          userId: session.userId,
          comment: comment ? String(comment) : null,
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

      return entry
    })

    await sendAdminSignupNotificationEmail({
      volunteerName: result.user.name,
      volunteerEmail: result.user.email,
      shiftTitle: result.shift.title,
      shiftDate: result.shift.date,
      comment: result.comment || 'Ingen kommentar',
      status: 'WAITLISTED',
    })

    return NextResponse.json(
      {
        message: 'Du er satt på ventelisten',
        entry: result,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'SHIFT_NOT_FOUND':
          return NextResponse.json(
            { error: 'Skift ikke funnet' },
            { status: 404 }
          )
        case 'SHIFT_HAS_CAPACITY':
          return NextResponse.json(
            { error: 'Det er fortsatt ledige plasser på skiftet. Meld deg på i stedet.' },
            { status: 409 }
          )
        case 'ALREADY_SIGNED':
          return NextResponse.json(
            { error: 'Du er allerede påmeldt dette skiftet' },
            { status: 400 }
          )
        case 'ALREADY_WAITLISTED':
          return NextResponse.json(
            { error: 'Du står allerede på ventelisten for dette skiftet' },
            { status: 400 }
          )
        case 'SHIFT_IN_PAST':
          return NextResponse.json(
            { error: 'Skiftet er allerede gjennomført.' },
            { status: 400 }
          )
        default:
          break
      }
    }

    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { error: 'Du står allerede på ventelisten for dette skiftet' },
        { status: 400 }
      )
    }

    console.error('Error adding to waitlist:', error)
    return NextResponse.json(
      { error: 'Kunne ikke legge deg til på ventelisten' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Ikke autorisert' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const shiftIdParam = searchParams.get('shiftId')

    if (!shiftIdParam) {
      return NextResponse.json(
        { error: 'shiftId må oppgis' },
        { status: 400 }
      )
    }

    const shiftId = parseInt(shiftIdParam, 10)

    if (Number.isNaN(shiftId)) {
      return NextResponse.json(
        { error: 'Ugyldig shiftId' },
        { status: 400 }
      )
    }

    const entries = await prisma.waitlistEntry.findMany({
      where: { shiftId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching waitlist:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente venteliste' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn' },
        { status: 401 }
      )
    }

    const { entryId, shiftId } = await request.json()

    let entry = null

    if (entryId) {
      entry = await prisma.waitlistEntry.findUnique({
        where: { id: Number(entryId) },
        include: {
          shift: true,
          user: true,
        },
      })
    } else if (shiftId) {
      const shiftIdNumber = typeof shiftId === 'number' ? shiftId : parseInt(shiftId, 10)

      if (Number.isNaN(shiftIdNumber)) {
        return NextResponse.json(
          { error: 'Ugyldig shiftId' },
          { status: 400 }
        )
      }

      entry = await prisma.waitlistEntry.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: session.userId,
          },
        },
        include: {
          shift: true,
          user: true,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'entryId eller shiftId må oppgis' },
        { status: 400 }
      )
    }

    if (!entry) {
      return NextResponse.json(
        { error: 'Ventelisteoppføring ikke funnet' },
        { status: 404 }
      )
    }

    const isOwner = entry.userId === session.userId
    const isAdmin = session.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Ikke autorisert' },
        { status: 403 }
      )
    }

    await prisma.waitlistEntry.delete({ where: { id: entry.id } })

    return NextResponse.json({ message: 'Ventelisteoppføringen er fjernet' })
  } catch (error) {
    console.error('Error removing waitlist entry:', error)
    return NextResponse.json(
      { error: 'Kunne ikke fjerne ventelisteoppføringen' },
      { status: 500 }
    )
  }
}

function isPrismaUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}
