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

function csvEscape(value: string | number | null | undefined) {
  if (value === null || typeof value === 'undefined') {
    return ''
  }

  const stringValue = String(value)

  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
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

    const header = ['navn', 'epost', 'dato', 'start', 'slutt', 'timer_for_skiftet']
    const lines = [header.join(',')]

    data.entries.forEach((entry) => {
      const row = [
        csvEscape(entry.volunteerName),
        csvEscape(entry.volunteerEmail),
        csvEscape(entry.shiftDate.toISOString().slice(0, 10)),
        csvEscape(entry.shiftStart.toISOString()),
        csvEscape(entry.shiftEnd.toISOString()),
        csvEscape(minutesToHours(entry.effectiveMinutes)),
      ]

      lines.push(row.join(','))
    })

    lines.push('')
    lines.push('navn,epost,total_timer')

    data.totals.forEach((total) => {
      const row = [
        csvEscape(total.volunteerName),
        csvEscape(total.volunteerEmail),
        csvEscape(minutesToHours(total.totalMinutes)),
      ]

      lines.push(row.join(','))
    })

    const csvContent = lines.join('\n')
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0]

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="timelog-${timestamp}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting timelog data:', error)
    return NextResponse.json(
      { error: 'Kunne ikke eksportere timelogger' },
      { status: 500 }
    )
  }
}
