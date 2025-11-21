import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { SignupStatus } from '@prisma/client'
import { getShiftStartDate } from './signups'
import { sendVolunteerReminderEmail } from './email'

const DEFAULT_WINDOW_MINUTES = 24 * 60
const FETCH_RANGE_MINUTES = DEFAULT_WINDOW_MINUTES * 2
const REMINDER_TOLERANCE_MINUTES = 30

export interface ReminderResult {
  sent: number
  skipped: number
  failures: Array<{ signupId: number; reason: string }>
}

function buildDateFilter(now: Date, rangeMinutes: number): Prisma.ShiftWhereInput {
  const to = new Date(now.getTime() + rangeMinutes * 60 * 1000)

  return {
    date: {
      gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      lte: to,
    },
  }
}

export async function sendUpcomingShiftReminders(
  windowMinutes = DEFAULT_WINDOW_MINUTES
): Promise<ReminderResult> {
  const now = new Date()

  const signups = await prisma.signup.findMany({
    where: {
      status: SignupStatus.CONFIRMED,
      reminderSentAt: null,
      shift: buildDateFilter(now, FETCH_RANGE_MINUTES),
    },
    include: {
      shift: true,
      user: true,
    },
  })

  let sent = 0
  let skipped = 0
  const failures: ReminderResult['failures'] = []

  for (const signup of signups) {
    const shiftStart = getShiftStartDate({
      date: signup.shift.date,
      startTime: signup.shift.startTime,
    })

    const minutesUntilShift = Math.round((shiftStart.getTime() - now.getTime()) / 60000)

    if (minutesUntilShift < 0) {
      skipped += 1
      continue
    }

    if (Math.abs(minutesUntilShift - windowMinutes) > REMINDER_TOLERANCE_MINUTES) {
      skipped += 1
      continue
    }

    try {
      await sendVolunteerReminderEmail({
        volunteerName: signup.user.name,
        volunteerEmail: signup.user.email,
        shiftTitle: signup.shift.title,
        shiftDate: signup.shift.date,
        shiftStart: signup.shift.startTime ?? 'Ukjent',
        shiftEnd: signup.shift.endTime ?? 'Ukjent',
        notes: signup.shift.notes,
      })

      await prisma.signup.update({
        where: { id: signup.id },
        data: { reminderSentAt: new Date() },
      })

      sent += 1
    } catch (error) {
      console.error('Feil ved sending av påminnelse:', error)
      failures.push({ signupId: signup.id, reason: (error as Error).message })
    }
  }

  return { sent, skipped, failures }
}
