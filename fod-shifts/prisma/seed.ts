import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Slett eksisterende data
  await prisma.passwordResetToken.deleteMany()
  await prisma.signup.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.user.deleteMany()

  // Opprett admin-bruker
  const hashedPassword = await bcrypt.hash('Admin123!', 10)
  
  const admin = await prisma.user.create({
    data: {
      name: 'Admin FOD',
      email: 'admin@fod.local',
      password: hashedPassword,
      role: 'admin',
    },
  })

  console.log('✅ Admin-bruker opprettet:', admin.email)

  // Opprett noen eksempel-skift for testing
  const shift1 = await prisma.shift.create({
    data: {
      title: 'Mating av hunder',
      description: 'Hjelp til med morgenmatingen av hundene',
      date: new Date('2025-11-25T08:00:00'),
      startTime: '08:00',
      endTime: '10:00',
      maxVolunteers: 3,
    },
  })

  const shift2 = await prisma.shift.create({
    data: {
      title: 'Rengjøring av kattebur',
      description: 'Rengjøring og vedlikehold av katteavdelingen',
      date: new Date('2025-11-26T14:00:00'),
      startTime: '14:00',
      endTime: '16:00',
      maxVolunteers: 2,
    },
  })

  const shift3 = await prisma.shift.create({
    data: {
      title: 'Tur med hunder',
      description: 'Ta hundene med på tur i skogen',
      date: new Date('2025-11-27T10:00:00'),
      startTime: '10:00',
      endTime: '12:00',
      maxVolunteers: 4,
    },
  })

  console.log('✅ Opprettet 3 eksempel-skift')
  console.log(`   - ${shift1.title}`)
  console.log(`   - ${shift2.title}`)
  console.log(`   - ${shift3.title}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
