export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { fetchTimelogData, minutesToHours } from '@/lib/timelog'
import { getSession } from '@/lib/session'

function parseDateParam(value: string | null, boundary: 'start' | 'end') {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  if (boundary === 'start') {
    parsed.setHours(0, 0, 0, 0)
  } else {
    parsed.setHours(23, 59, 59, 999)
  }

  return parsed
}

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const url = new URL(request.url)
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')

    const filters = {
      from: parseDateParam(fromParam, 'start'),
      to: parseDateParam(toParam, 'end'),
    }

    const data = await fetchTimelogData(filters)

    const response = {
      entries: data.entries.map((entry) => ({
        signupId: entry.signupId,
        userId: entry.userId,
        volunteerName: entry.volunteerName,
        volunteerEmail: entry.volunteerEmail,
        shiftId: entry.shiftId,
        shiftTitle: entry.shiftTitle,
        shiftDate: entry.shiftDate.toISOString(),
        shiftStart: entry.shiftStart.toISOString(),
        shiftEnd: entry.shiftEnd.toISOString(),
        scheduledMinutes: entry.scheduledMinutes,
        scheduledHours: minutesToHours(entry.scheduledMinutes),
        workedMinutes: entry.workedMinutes,
        workedHours:
          typeof entry.workedMinutes === 'number'
            ? minutesToHours(entry.workedMinutes)
            : null,
        effectiveMinutes: entry.effectiveMinutes,
        effectiveHours: minutesToHours(entry.effectiveMinutes),
      })),
      totals: data.totals.map((total) => ({
        userId: total.userId,
        volunteerName: total.volunteerName,
        volunteerEmail: total.volunteerEmail,
        totalMinutes: total.totalMinutes,
        totalHours: minutesToHours(total.totalMinutes),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching timelog data:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente timelogger' },
      { status: 500 }
    )
  }
}
