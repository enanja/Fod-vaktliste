import { Prisma, SignupStatus } from '@prisma/client'
import { prisma } from './prisma'
import {
  calculateScheduledMinutes,
  getEffectiveWorkedMinutes,
  getShiftEndDate,
  getShiftStartDate,
} from './signups'

export interface TimelogFilters {
  from?: Date
  to?: Date
}

export interface TimelogEntry {
  signupId: number
  userId: number
  volunteerName: string
  volunteerEmail: string
  shiftId: number
  shiftTitle: string
  shiftDate: Date
  shiftStart: Date
  shiftEnd: Date
  scheduledMinutes: number
  workedMinutes: number | null
  effectiveMinutes: number
}

export interface TimelogTotals {
  userId: number
  volunteerName: string
  volunteerEmail: string
  totalMinutes: number
}

export interface TimelogResult {
  entries: TimelogEntry[]
  totals: TimelogTotals[]
}

function buildShiftFilter(from?: Date, to?: Date): Prisma.ShiftWhereInput {
  const filter: Prisma.DateTimeFilter = {}

  if (from) {
    filter.gte = from
  }

  if (to) {
    filter.lte = to
  }

  if (Object.keys(filter).length === 0) {
    return {}
  }

  return { date: filter }
}

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100
}

export async function fetchTimelogData(filters: TimelogFilters = {}): Promise<TimelogResult> {
  const { from, to } = filters
  const now = new Date()

  const signups = await prisma.signup.findMany({
    where: {
      status: SignupStatus.CONFIRMED,
      shift: buildShiftFilter(from, to),
    },
    include: {
      shift: true,
      user: true,
    },
    orderBy: [
      { shift: { date: 'desc' } },
      { shift: { startTime: 'asc' } },
      { user: { name: 'asc' } },
    ],
  })

  const finished = signups.filter((signup) => {
    const shiftEnd = getShiftEndDate({
      date: signup.shift.date,
      startTime: signup.shift.startTime,
      endTime: signup.shift.endTime,
    })
    return shiftEnd.getTime() <= now.getTime()
  })

  const entries: TimelogEntry[] = finished.map((signup) => {
    const scheduledMinutes =
      signup.shift.startTime && signup.shift.endTime
        ? calculateScheduledMinutes(signup.shift.startTime, signup.shift.endTime)
        : 0

    const effectiveMinutes = getEffectiveWorkedMinutes(signup, {
      startTime: signup.shift.startTime,
      endTime: signup.shift.endTime,
    })

    return {
      signupId: signup.id,
      userId: signup.userId,
      volunteerName: signup.user.name,
      volunteerEmail: signup.user.email,
      shiftId: signup.shiftId,
      shiftTitle: signup.shift.title,
      shiftDate: signup.shift.date,
      shiftStart: getShiftStartDate({
        date: signup.shift.date,
        startTime: signup.shift.startTime,
      }),
      shiftEnd: getShiftEndDate({
        date: signup.shift.date,
        startTime: signup.shift.startTime,
        endTime: signup.shift.endTime,
      }),
      scheduledMinutes,
      workedMinutes: signup.workedMinutes ?? null,
      effectiveMinutes,
    }
  })

  const totalsMap = new Map<number, TimelogTotals>()

  entries.forEach((entry) => {
    const current = totalsMap.get(entry.userId)

    if (!current) {
      totalsMap.set(entry.userId, {
        userId: entry.userId,
        volunteerName: entry.volunteerName,
        volunteerEmail: entry.volunteerEmail,
        totalMinutes: entry.effectiveMinutes,
      })
      return
    }

    current.totalMinutes += entry.effectiveMinutes
  })

  return {
    entries,
    totals: Array.from(totalsMap.values()).sort((a, b) =>
      a.volunteerName.localeCompare(b.volunteerName, 'no')),
  }
}
