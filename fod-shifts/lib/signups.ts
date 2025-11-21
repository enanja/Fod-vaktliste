import { Prisma, PrismaClient, SignupStatus } from '@prisma/client'
import { prisma } from './prisma'

const MINUTES_PER_HOUR = 60
const OSLO_TIMEZONE = 'Europe/Oslo'

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient

export function combineDateAndTime(date: Date, time?: string | null): Date {
  const merged = new Date(date)

  if (!time) {
    return merged
  }

  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  if (!Number.isNaN(hours)) {
    merged.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
  }

  return merged
}

export function calculateScheduledMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map((value) => parseInt(value, 10))
  const [endH, endM] = endTime.split(':').map((value) => parseInt(value, 10))

  if ([startH, startM, endH, endM].some((value) => Number.isNaN(value))) {
    return 0
  }

  const startMinutes = startH * MINUTES_PER_HOUR + startM
  const endMinutes = endH * MINUTES_PER_HOUR + endM
  const diff = endMinutes - startMinutes

  return diff > 0 ? diff : 0
}

export function getShiftEndDate(
  shift: { date: Date; startTime: string | null; endTime: string | null },
  timeZone = OSLO_TIMEZONE
) {
  const start = getShiftStartDate(shift, timeZone)

  if (!shift.startTime || !shift.endTime) {
    return start
  }

  const scheduledMinutes = calculateScheduledMinutes(shift.startTime, shift.endTime)
  return new Date(start.getTime() + scheduledMinutes * 60 * 1000)
}

export function getEffectiveWorkedMinutes(
  signup: { workedMinutes: number | null | undefined },
  shift: { startTime: string | null; endTime: string | null }
) {
  if (typeof signup.workedMinutes === 'number' && signup.workedMinutes >= 0) {
    return signup.workedMinutes
  }

  if (!shift.startTime || !shift.endTime) {
    return 0
  }

  return calculateScheduledMinutes(shift.startTime, shift.endTime)
}

function getTimezoneOffset(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = dtf.formatToParts(date)
  const mapping = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value
    }
    return acc
  }, {})

  const utcTime = Date.UTC(
    parseInt(mapping.year, 10),
    parseInt(mapping.month, 10) - 1,
    parseInt(mapping.day, 10),
    parseInt(mapping.hour, 10),
    parseInt(mapping.minute, 10),
    parseInt(mapping.second, 10)
  )

  return (utcTime - date.getTime()) / 60000
}

function getDateParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = dtf.formatToParts(date)
  const getValue = (type: string) => parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10)

  return {
    year: getValue('year'),
    month: getValue('month'),
    day: getValue('day'),
  }
}

export function getShiftStartDate(
  shift: { date: Date; startTime: string | null },
  timeZone = OSLO_TIMEZONE
) {
  const { year, month, day } = getDateParts(shift.date, timeZone)
  const [hourStr, minuteStr] = (shift.startTime ?? '00:00').split(':')

  const baseUtc = Date.UTC(
    year,
    month - 1,
    day,
    parseInt(hourStr, 10) || 0,
    parseInt(minuteStr, 10) || 0,
    0
  )

  const baseDate = new Date(baseUtc)
  const offsetMinutes = getTimezoneOffset(baseDate, timeZone)

  return new Date(baseDate.getTime() - offsetMinutes * 60 * 1000)
}

export function isShiftInPast(
  shift: { date: Date; startTime: string | null; endTime: string | null },
  now = new Date(),
  timeZone = OSLO_TIMEZONE
) {
  const shiftEnd = getShiftEndDate(shift, timeZone)
  return shiftEnd.getTime() <= now.getTime()
}

// Promote the longest-waiting volunteer when capacity frees up.
export async function promoteNextWaitlistedVolunteer(
  shiftId: number,
  client: PrismaClientOrTransaction = prisma
) {
  const shift = await client.shift.findUnique({
    where: { id: shiftId },
    include: {
      signups: {
        where: {
          status: SignupStatus.CONFIRMED,
        },
        select: {
          id: true,
        },
      },
      waitlistEntries: {
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
        include: {
          user: true,
        },
      },
    },
  })

  if (!shift) {
    return null
  }

  if (shift.signups.length >= shift.maxVolunteers) {
    return null
  }

  const entry = shift.waitlistEntries.find((candidate) => {
    const candidateUser = candidate.user as { isBlocked?: boolean | null; status?: string | null }
    return !candidateUser?.isBlocked && candidateUser?.status !== 'blocked'
  })

  if (!entry) {
    return null
  }

  const signup = await client.signup.upsert({
    where: {
      shiftId_userId: {
        shiftId,
        userId: entry.userId,
      },
    },
    update: {
      status: SignupStatus.CONFIRMED,
      cancelledAt: null,
      confirmedAt: new Date(),
      comment: entry.comment ?? undefined,
    },
    create: {
      shiftId,
      userId: entry.userId,
      status: SignupStatus.CONFIRMED,
      confirmedAt: new Date(),
      comment: entry.comment ?? null,
    },
    include: {
      shift: true,
      user: true,
    },
  })

  await client.waitlistEntry.delete({
    where: {
      id: entry.id,
    },
  })

  return {
    signup,
    promotedFrom: entry,
  }
}
