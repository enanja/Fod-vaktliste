import { Prisma, SignupStatus } from '@prisma/client'
import { fetchTimelogData, TimelogFilters } from './timelog'
import { prisma } from './prisma'

export interface AdminStatsFilters extends TimelogFilters {
  minHours?: number
}

export interface MonthlyTotal {
  month: string
  minutes: number
  hours: number
}

export interface ActiveVolunteerSummary {
  userId: number
  volunteerName: string
  volunteerEmail: string
  minutes: number
  hours: number
}

export interface UnderfilledShift {
  shiftId: number
  title: string
  date: Date
  maxVolunteers: number
  confirmedCount: number
  waitlistCount: number
  vacancy: number
}

export interface AdminStatsResult {
  monthlyTotals: MonthlyTotal[]
  activeVolunteers: ActiveVolunteerSummary[]
  underfilledShifts: UnderfilledShift[]
}

function buildShiftFilter(filters: TimelogFilters): Prisma.ShiftWhereInput {
  if (!filters.from && !filters.to) {
    return {}
  }

  const range: Prisma.DateTimeFilter = {}

  if (filters.from) {
    range.gte = filters.from
  }

  if (filters.to) {
    range.lte = filters.to
  }

  return {
    date: range,
  }
}

export async function computeAdminStats(
  filters: AdminStatsFilters = {}
): Promise<AdminStatsResult> {
  const minHours = filters.minHours ?? 4
  const minMinutesThreshold = minHours * 60

  const timelog = await fetchTimelogData(filters)

  const monthlyMap = new Map<string, number>()

  timelog.entries.forEach((entry) => {
    const date = new Date(entry.shiftDate)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + entry.effectiveMinutes)
  })

  const monthlyTotals: MonthlyTotal[] = Array.from(monthlyMap.entries())
    .map(([month, minutes]) => ({
      month,
      minutes,
      hours: Math.round((minutes / 60) * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const activeVolunteers: ActiveVolunteerSummary[] = timelog.totals
    .filter((total) => total.totalMinutes >= minMinutesThreshold)
    .map((total) => ({
      userId: total.userId,
      volunteerName: total.volunteerName,
      volunteerEmail: total.volunteerEmail,
      minutes: total.totalMinutes,
      hours: Math.round((total.totalMinutes / 60) * 100) / 100,
    }))
    .sort((a, b) => b.hours - a.hours)

  const shifts = await prisma.shift.findMany({
    where: buildShiftFilter(filters),
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
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: 200,
  })

  const underfilledShifts: UnderfilledShift[] = shifts
    .map((shift) => {
      const confirmedCount = shift.signups.length
      const vacancy = Math.max(shift.maxVolunteers - confirmedCount, 0)
      return {
        shiftId: shift.id,
        title: shift.title,
        date: shift.date,
        maxVolunteers: shift.maxVolunteers,
        confirmedCount,
        waitlistCount: shift.waitlistEntries.length,
        vacancy,
      }
    })
    .filter((item) => item.vacancy > 0)
    .sort((a, b) => b.vacancy - a.vacancy)
    .slice(0, 10)

  return {
    monthlyTotals,
    activeVolunteers,
    underfilledShifts,
  }
}
