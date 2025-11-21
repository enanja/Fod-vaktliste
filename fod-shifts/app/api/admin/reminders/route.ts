export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { sendUpcomingShiftReminders } from '@/lib/reminders'

export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { windowMinutes } = await request.json().catch(() => ({ windowMinutes: undefined }))

    const result = await sendUpcomingShiftReminders(windowMinutes)

    console.log(
      `[reminders] Admin ${session.userId} trigget utsending: sent=${result.sent}, skipped=${result.skipped}, failures=${result.failures.length}`
    )

    return NextResponse.json({
      sent: result.sent,
      skipped: result.skipped,
      failures: result.failures,
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Kunne ikke sende påminnelser' }, { status: 500 })
  }
}
