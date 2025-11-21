/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  sendAdminSignupNotificationEmail,
  sendAdminCancellationEmail,
  sendAdminWaitlistPromotionEmail,
  sendVolunteerPromotionEmail,
  sendVolunteerCancellationEmail,
  sendVolunteerAddedByAdminEmail,
} from '@/lib/email'
import { promoteNextWaitlistedVolunteer, getShiftStartDate, isShiftInPast } from '@/lib/signups'
import { SignupStatus } from '@prisma/client'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const prismaClient = prisma as any

type SignupWithShiftAndUser = Prisma.SignupGetPayload<{
  include: {
    shift: true
    user: {
      select: {
        id: true
        name: true
        email: true
      }
    }
  }
}>

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

    if (session.isBlocked || session.status === 'blocked') {
      return NextResponse.json(
        { error: 'Du har ikke lenger tilgang til å melde deg på skift.' },
        { status: 403 }
      )
    }

    const {
      shiftId,
      comment,
      userId: overrideUserId,
      userEmail,
    } = await request.json()

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Skift-ID er påkrevd' },
        { status: 400 }
      )
    }

    const shiftIdNumber = typeof shiftId === 'number' ? shiftId : parseInt(shiftId, 10)

    if (Number.isNaN(shiftIdNumber)) {
      return NextResponse.json(
        { error: 'Ugyldig skift-ID' },
        { status: 400 }
      )
    }

    const isAdmin = session.role === 'ADMIN'

    let targetUserId = session.userId
    let overrideUser: { id: number; isBlocked: boolean; status: string | null } | null = null

    if (overrideUserId || userEmail) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Kun admin kan legge til andre frivillige' },
          { status: 403 }
        )
      }

      if (overrideUserId) {
        const parsedUserId = typeof overrideUserId === 'number'
          ? overrideUserId
          : parseInt(overrideUserId, 10)

        if (Number.isNaN(parsedUserId)) {
          return NextResponse.json(
            { error: 'Ugyldig bruker-ID' },
            { status: 400 }
          )
        }

        overrideUser = await prismaClient.user.findUnique({
          where: { id: parsedUserId },
          select: {
            id: true,
            isBlocked: true,
            status: true,
          },
        })
      } else if (typeof userEmail === 'string') {
        overrideUser = await prismaClient.user.findUnique({
          where: { email: userEmail.trim().toLowerCase() },
          select: {
            id: true,
            isBlocked: true,
            status: true,
          },
        })
      }

      if (!overrideUser) {
        return NextResponse.json(
          { error: 'Fant ingen frivillig med denne informasjonen' },
          { status: 404 }
        )
      }

      if (overrideUser.isBlocked || overrideUser.status === 'blocked') {
        return NextResponse.json(
          { error: 'Denne frivillige er blokkert og kan ikke meldes på.' },
          { status: 403 }
        )
      }

      targetUserId = overrideUser.id
    }

    const signup = await prismaClient.$transaction(async (tx: any) => {
      const shift = await tx.shift.findUnique({
        where: { id: shiftIdNumber },
        select: {
          id: true,
          maxVolunteers: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      })

      if (!shift) {
        throw new Error('SHIFT_NOT_FOUND')
      }

      if (!isAdmin && isShiftInPast(shift)) {
        throw new Error('SHIFT_IN_PAST')
      }

      const currentHeadcount = await tx.signup.count({
        where: {
          shiftId: shiftIdNumber,
          status: SignupStatus.CONFIRMED,
        },
      })
      const overridingAnotherUser = targetUserId !== session.userId

      if (currentHeadcount >= shift.maxVolunteers && !overridingAnotherUser) {
        throw new Error('SHIFT_FULL')
      }

      const existingSignup = await tx.signup.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: targetUserId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      })

      if (existingSignup && existingSignup.status === SignupStatus.CONFIRMED) {
        throw new Error('ALREADY_SIGNED')
      }

      const transactionalClient = tx as typeof prisma
      const waitlistEntry = await transactionalClient.waitlistEntry.findUnique({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: targetUserId,
          },
        },
      })

      if (waitlistEntry) {
        await transactionalClient.waitlistEntry.delete({ where: { id: waitlistEntry.id } })
      }

      const now = new Date()

      const createdSignup = await tx.signup.upsert({
        where: {
          shiftId_userId: {
            shiftId: shiftIdNumber,
            userId: targetUserId,
          },
        },
        update: {
          status: SignupStatus.CONFIRMED,
          comment: comment ? String(comment) : null,
          cancelledAt: null,
          confirmedAt: now,
        },
        create: {
          shiftId: shiftIdNumber,
          userId: targetUserId,
          comment: comment ? String(comment) : null,
          status: SignupStatus.CONFIRMED,
          confirmedAt: now,
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

      return createdSignup as SignupWithShiftAndUser
    })

    await sendAdminSignupNotificationEmail({
      volunteerName: signup.user.name,
      volunteerEmail: signup.user.email,
      shiftTitle: signup.shift.title,
      shiftDate: signup.shift.date,
      comment: signup.comment || 'Ingen kommentar',
      status: 'CONFIRMED',
    })

    if (isAdmin && targetUserId !== session.userId) {
      await sendVolunteerAddedByAdminEmail({
        volunteerName: signup.user.name,
        volunteerEmail: signup.user.email,
        shiftTitle: signup.shift.title,
        shiftDate: signup.shift.date,
        shiftStart: signup.shift.startTime ?? 'Ukjent',
        shiftEnd: signup.shift.endTime ?? 'Ukjent',
        notes: signup.shift.notes,
      })
    }

    const responseMessage =
      isAdmin && targetUserId !== session.userId
        ? `Frivillig ${signup.user.name} er lagt til på skiftet.`
        : 'Påmelding vellykket'

    return NextResponse.json(
      { message: responseMessage, signup },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'SHIFT_NOT_FOUND':
          return NextResponse.json(
            { error: 'Skift ikke funnet' },
            { status: 404 }
          )
        case 'SHIFT_FULL':
          return NextResponse.json(
            { error: 'Skiftet er fullt. Du kan sette deg på ventelisten.' },
            { status: 409 }
          )
        case 'SHIFT_IN_PAST':
          return NextResponse.json(
            { error: 'Skiftet er allerede gjennomført.' },
            { status: 400 }
          )
        case 'ALREADY_SIGNED':
          return NextResponse.json(
            { error: 'Du er allerede påmeldt dette skiftet' },
            { status: 400 }
          )
        case 'SHIFT_FULL':
          return NextResponse.json(
            { error: 'Skiftet er fullt. Du kan sette deg på ventelisten.' },
            { status: 409 }
          )
        default:
          break
      }
    }

    if (isPrismaUniqueError(error)) {
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

    const signups = await prismaClient.signup.findMany({
      where: {
        userId: session.userId,
        status: SignupStatus.CONFIRMED,
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

// DELETE - Meld seg av et skift (frivillig) eller fjern frivillig (admin)
export async function DELETE(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn' },
        { status: 401 }
      )
    }

    const { signupId } = await request.json()

    if (!signupId) {
      return NextResponse.json(
        { error: 'signupId er påkrevd' },
        { status: 400 }
      )
    }

    const signup = await prismaClient.signup.findUnique({
      where: { id: Number(signupId) },
      include: {
        shift: true,
        user: true,
      },
    })

    if (!signup) {
      return NextResponse.json(
        { error: 'Påmelding ikke funnet' },
        { status: 404 }
      )
    }

    const isOwner = signup.userId === session.userId
    const isAdmin = session.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Ikke autorisert' },
        { status: 403 }
      )
    }

    if (!isAdmin) {
      const shiftStart = getShiftStartDate({
        date: signup.shift.date,
        startTime: signup.shift.startTime,
      })

      if (shiftStart.getTime() - Date.now() < TWENTY_FOUR_HOURS_MS) {
        return NextResponse.json(
          {
            error:
              'Du kan ikke melde deg av senere enn 24 timer før skiftet starter. Ta kontakt med admin.',
          },
          { status: 409 }
        )
      }
    }

    if (signup.status === SignupStatus.CANCELLED) {
      return NextResponse.json(
        { message: 'Påmeldingen er allerede kansellert' },
        { status: 200 }
      )
    }

    const { updatedSignup, promotion } = await prismaClient.$transaction(async (tx: any) => {
      const updated = await tx.signup.update({
        where: { id: signup.id },
        data: {
          status: SignupStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: {
          shift: true,
          user: true,
        },
      })

      const promotionResult = await promoteNextWaitlistedVolunteer(signup.shiftId, tx)

      return {
        updatedSignup: updated,
        promotion: promotionResult,
      }
    })

    await sendAdminCancellationEmail({
      volunteerName: updatedSignup.user.name,
      volunteerEmail: updatedSignup.user.email,
      shiftTitle: updatedSignup.shift.title,
      shiftDate: updatedSignup.shift.date,
      initiatedByAdmin: session.role === 'ADMIN',
    })

    await sendVolunteerCancellationEmail({
      volunteerName: updatedSignup.user.name,
      volunteerEmail: updatedSignup.user.email,
      shiftTitle: updatedSignup.shift.title,
      shiftDate: updatedSignup.shift.date,
      initiatedByAdmin: session.role === 'ADMIN' && !isOwner,
    })

    if (promotion) {
      await sendAdminWaitlistPromotionEmail({
        volunteerName: promotion.signup.user.name,
        volunteerEmail: promotion.signup.user.email,
        shiftTitle: promotion.signup.shift.title,
        shiftDate: promotion.signup.shift.date,
        comment: promotion.signup.comment,
      })

      await sendVolunteerPromotionEmail({
        volunteerName: promotion.signup.user.name,
        volunteerEmail: promotion.signup.user.email,
        shiftTitle: promotion.signup.shift.title,
        shiftDate: promotion.signup.shift.date,
        comment: promotion.signup.comment,
      })
    }

    const message = isAdmin
      ? 'Frivillig er fjernet fra skiftet.'
      : 'Du er meldt av skiftet.'

    const promotionMessage = promotion
      ? `${promotion.signup.user.name} er flyttet fra ventelisten til skiftet.`
      : null

    return NextResponse.json({
      message,
      promotion,
      filledFromWaitlist: Boolean(promotion),
      promotionMessage,
      promotionSignupId: promotion?.signup.id ?? null,
    })
  } catch (error) {
    console.error('Error cancelling signup:', error)
    return NextResponse.json(
      { error: 'Kunne ikke kansellere påmelding' },
      { status: 500 }
    )
  }
}

function isPrismaUniqueError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
  )
}
