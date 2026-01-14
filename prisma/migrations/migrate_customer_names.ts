/**
 * Migration script to split customerName into firstName, middleName, lastName
 * Run with: npx ts-node prisma/migrations/migrate_customer_names.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Intelligently splits a name into firstName, middleName, lastName
 * Based on spaces between names
 */
function splitName(name: string): { firstName: string; middleName?: string; lastName?: string } {
  if (!name || name.trim() === '') {
    return { firstName: '' }
  }

  // Remove extra spaces and trim
  const cleaned = name.trim().replace(/\s+/g, ' ')
  
  // Split by spaces
  const parts = cleaned.split(' ').filter(part => part.length > 0)

  if (parts.length === 0) {
    return { firstName: '' }
  }

  if (parts.length === 1) {
    // Single name - treat as firstName
    return { firstName: parts[0] }
  }

  if (parts.length === 2) {
    // Two names - firstName and lastName
    return {
      firstName: parts[0],
      lastName: parts[1],
    }
  }

  // Three or more names - firstName, middleName(s), lastName
  // Join all middle parts
  const middleParts = parts.slice(1, -1)
  return {
    firstName: parts[0],
    middleName: middleParts.join(' '),
    lastName: parts[parts.length - 1],
  }
}

async function migrateCustomerNames() {
  console.log('Starting customer name migration...')

  try {
    // Get all customers
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        customerName: true,
      },
    })

    console.log(`Found ${customers.length} customers to migrate`)

    let migrated = 0
    let skipped = 0

    for (const customer of customers) {
      // Skip if customerName is empty or already migrated (if firstName exists and customerName is empty)
      if (!customer.customerName || customer.customerName.trim() === '') {
        skipped++
        continue
      }

      // Split the name
      const { firstName, middleName, lastName } = splitName(customer.customerName)

      // Update the customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName,
          middleName: middleName || null,
          lastName: lastName || null,
        },
      })

      migrated++
      if (migrated % 100 === 0) {
        console.log(`Migrated ${migrated} customers...`)
      }
    }

    console.log(`\nMigration complete!`)
    console.log(`Migrated: ${migrated}`)
    console.log(`Skipped: ${skipped}`)
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateCustomerNames()
  .then(() => {
    console.log('Migration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
