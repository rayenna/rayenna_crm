import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rayenna.com' },
    update: {},
    create: {
      email: 'admin@rayenna.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  console.log('Created admin user:', admin.email)

  // Create sample sales user
  const salesPassword = await bcrypt.hash('sales123', 10)
  
  const sales = await prisma.user.upsert({
    where: { email: 'sales@rayenna.com' },
    update: {},
    create: {
      email: 'sales@rayenna.com',
      name: 'Sales User',
      password: salesPassword,
      role: UserRole.SALES,
    },
  })

  console.log('Created sales user:', sales.email)

  // Create sample operations user
  const opsPassword = await bcrypt.hash('ops123', 10)
  
  const ops = await prisma.user.upsert({
    where: { email: 'operations@rayenna.com' },
    update: {},
    create: {
      email: 'operations@rayenna.com',
      name: 'Operations User',
      password: opsPassword,
      role: UserRole.OPERATIONS,
    },
  })

  console.log('Created operations user:', ops.email)

  // Create sample finance user
  const financePassword = await bcrypt.hash('finance123', 10)
  
  const finance = await prisma.user.upsert({
    where: { email: 'finance@rayenna.com' },
    update: {},
    create: {
      email: 'finance@rayenna.com',
      name: 'Finance User',
      password: financePassword,
      role: UserRole.FINANCE,
    },
  })

  console.log('Created finance user:', finance.email)

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
