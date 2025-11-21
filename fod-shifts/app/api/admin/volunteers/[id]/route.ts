export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type VolunteerAction = 'block' | 'unblock'

const prismaClient = prisma as any

function parseAction(value: unknown): VolunteerAction | null {
  if (value === 'block' || value === 'unblock') {
    return value
  }
  return null
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
    const userId = Number(id)

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Ugyldig bruker-ID' }, { status: 400 })
    }

    const body = await request.json()
    const action = parseAction(body?.action)
    const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null

    if (!action) {
      return NextResponse.json({ error: 'Ugyldig handling' }, { status: 400 })
    }

    const volunteer = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isBlocked: true,
        status: true,
      },
    })

    if (!volunteer || volunteer.role !== 'FRIVILLIG') {
      return NextResponse.json({ error: 'Frivillig ikke funnet' }, { status: 404 })
    }

    if (action === 'block') {
      const updated = await prismaClient.user.update({
        where: { id: userId },
        data: {
          isBlocked: true,
          status: 'blocked',
          blockedAt: new Date(),
          blockedReason: reason,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          createdAt: true,
        },
      })

      await prismaClient.waitlistEntry.deleteMany({ where: { userId } })

      return NextResponse.json({ volunteer: updated })
    }

    if (action === 'unblock') {
      const updated = await prismaClient.user.update({
        where: { id: userId },
        data: {
          isBlocked: false,
          status: 'active',
          blockedAt: null,
          blockedReason: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          isBlocked: true,
          blockedAt: true,
          blockedReason: true,
          createdAt: true,
        },
      })

      return NextResponse.json({ volunteer: updated })
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 })
  } catch (error) {
    console.error('Error updating volunteer:', error)
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere frivillig.' },
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
    const userId = Number(id)

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Ugyldig bruker-ID' }, { status: 400 })
    }

    const volunteer = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
      },
    })

    if (!volunteer || volunteer.role !== 'FRIVILLIG') {
      return NextResponse.json({ error: 'Frivillig ikke funnet' }, { status: 404 })
    }

    if (volunteer.id === session.userId) {
      return NextResponse.json(
        { error: 'Du kan ikke slette din egen konto.' },
        { status: 400 }
      )
    }

    await prismaClient.user.delete({ where: { id: userId } })

    return NextResponse.json({ message: 'Frivillig slettet.' })
  } catch (error) {
    console.error('Error deleting volunteer:', error)
    return NextResponse.json(
      { error: 'Kunne ikke slette frivillig.' },
      { status: 500 }
    )
  }
}
