export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { computeAdminStats } from '@/lib/stats'

function parseDate(value: string | null, boundary: 'start' | 'end') {
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

    const from = parseDate(url.searchParams.get('from'), 'start')
    const to = parseDate(url.searchParams.get('to'), 'end')
    const minHoursParam = url.searchParams.get('minHours')
    const minHours = minHoursParam ? Number(minHoursParam) : undefined

    const stats = await computeAdminStats({ from, to, minHours })

    return NextResponse.json({
      monthlyTotals: stats.monthlyTotals.map((item) => ({
        month: item.month,
        minutes: item.minutes,
        hours: item.hours,
      })),
      activeVolunteers: stats.activeVolunteers,
      shiftSummaries: stats.shiftSummaries.map((shift) => ({
        shiftId: shift.shiftId,
        title: shift.title,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.type,
        maxVolunteers: shift.maxVolunteers,
        confirmedCount: shift.confirmedCount,
        waitlistCount: shift.waitlistCount,
        vacancy: shift.vacancy,
        isPast: shift.isPast,
      })),
      underfilledShifts: stats.underfilledShifts.map((shift) => ({
        shiftId: shift.shiftId,
        title: shift.title,
        date: shift.date.toISOString(),
        maxVolunteers: shift.maxVolunteers,
        confirmedCount: shift.confirmedCount,
        waitlistCount: shift.waitlistCount,
        vacancy: shift.vacancy,
      })),
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Kunne ikke hente statistikk' }, { status: 500 })
  }
}
