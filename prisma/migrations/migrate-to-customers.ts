/**
 * Migration script to move customer data from Projects to Customer Master
 * Run this after creating the Customer model and before running the migration
 * 
 * Usage: npx ts-node prisma/migrations/migrate-to-customers.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateCustomerId } from '../src/utils/customerId';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration: Projects -> Customers...');

  try {
    // Get all projects
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        customerName: true,
        address: true,
        contactNumbers: true,
        consumerNumber: true,
        leadSource: true,
        leadBroughtBy: true,
      },
    });

    console.log(`Found ${projects.length} projects to migrate`);

    // Group projects by unique customer (based on customerName and consumerNumber)
    const customerMap = new Map<string, string>(); // customerKey -> customerId

    for (const project of projects) {
      // Create a unique key for the customer
      const customerKey = `${project.customerName}_${project.consumerNumber || 'no-consumer'}`.toLowerCase();

      let customerId: string;

      if (customerMap.has(customerKey)) {
        // Customer already exists, use existing customerId
        customerId = customerMap.get(customerKey)!;
      } else {
        // Create new customer
        const newCustomerId = await generateCustomerId();
        
        const customer = await prisma.customer.create({
          data: {
            customerId: newCustomerId,
            customerName: project.customerName,
            address: project.address,
            contactNumbers: project.contactNumbers,
            consumerNumber: project.consumerNumber,
            leadSource: project.leadSource,
            leadBroughtBy: project.leadBroughtBy,
          },
        });

        customerId = customer.id;
        customerMap.set(customerKey, customerId);
        console.log(`Created customer: ${customer.customerId} - ${customer.customerName}`);
      }

      // Update project with customerId
      await prisma.project.update({
        where: { id: project.id },
        data: { customerId },
      });
    }

    console.log(`Migration completed! Created ${customerMap.size} customers and updated ${projects.length} projects.`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
