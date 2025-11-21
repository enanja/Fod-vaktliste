export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const shiftId = parseInt(id)

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
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

    if (!shift) {
      return NextResponse.json(
        { error: 'Skift ikke funnet' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...shift,
      signupCount: shift.signups.length,
      waitlistCount: shift.waitlistEntries.length,
    })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente skift' },
      { status: 500 }
    )
  }
}
