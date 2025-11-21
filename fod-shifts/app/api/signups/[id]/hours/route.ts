export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getEffectiveWorkedMinutes } from '@/lib/signups'
import { minutesToHours } from '@/lib/timelog'

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
    const signupId = Number(id)

    if (Number.isNaN(signupId)) {
      return NextResponse.json({ error: 'Ugyldig ID' }, { status: 400 })
    }

    const body = await request.json()
    const { hours } = body as { hours?: number | string | null }

    let minutes: number | null | undefined

    if (hours === null || hours === '') {
      minutes = null
    } else if (typeof hours === 'string') {
      const parsed = Number(hours)
      if (Number.isNaN(parsed)) {
        return NextResponse.json({ error: 'Timer må være et tall' }, { status: 400 })
      }
      minutes = Math.round(parsed * 60)
    } else if (typeof hours === 'number') {
      minutes = Math.round(hours * 60)
    }

    if (typeof minutes === 'number' && minutes < 0) {
      return NextResponse.json({ error: 'Timer kan ikke være negativt' }, { status: 400 })
    }

    const updated = await prisma.signup.update({
      where: { id: signupId },
      data: {
        workedMinutes: minutes ?? null,
      },
      include: {
        shift: true,
        user: true,
      },
    })

    const effectiveMinutes = getEffectiveWorkedMinutes(updated, {
      startTime: updated.shift.startTime,
      endTime: updated.shift.endTime,
    })

    return NextResponse.json({
      signupId: updated.id,
      workedMinutes: updated.workedMinutes,
      workedHours:
        typeof updated.workedMinutes === 'number'
          ? minutesToHours(updated.workedMinutes)
          : null,
      effectiveMinutes,
      effectiveHours: minutesToHours(effectiveMinutes),
    })
  } catch (error) {
    console.error('Error updating worked minutes:', error)
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere timer' },
      { status: 500 }
    )
  }
}
