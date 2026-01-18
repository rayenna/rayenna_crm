// Migration script to copy data from local DB to Neon
// Usage: node migrate-data-to-neon.js <local_db_url> <neon_db_url>

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function migrateData() {
  console.log('=========================================');
  console.log('Local Database → Neon Migration Tool');
  console.log('=========================================\n');

  // Get database URLs (filter out flags like --yes)
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const localUrl = args[0] || 'postgresql://postgres:password@localhost:5432/rayenna_crm';
  const neonUrl = args[1] || 'postgresql://neondb_owner:npg_YBTlVfenu2k7@ep-twilight-water-a1ahtaf4-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

  console.log('Local DB:', localUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('Neon DB:', neonUrl.replace(/:[^:@]+@/, ':****@'));
  console.log('');

  // Skip confirmation if --yes flag is provided or in non-interactive mode
  const skipConfirm = process.argv.includes('--yes') || !process.stdin.isTTY;
  
  if (!skipConfirm) {
    const confirm = await question('Continue with migration? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      rl.close();
      return;
    }
  } else {
    console.log('⏩ Skipping confirmation (--yes flag or non-interactive mode)');
  }

  const localPrisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
  const neonPrisma = new PrismaClient({ datasources: { db: { url: neonUrl } } });

  try {
    console.log('\nStep 1: Reading data from local database...');
    
    // Read all data
    const [users, customers, projects, leads, documents] = await Promise.all([
      localPrisma.user.findMany(),
      localPrisma.customer.findMany(),
      localPrisma.project.findMany({ include: { customer: true } }),
      localPrisma.lead.findMany(),
      localPrisma.document.findMany(),
    ]);

    console.log(`✅ Found: ${users.length} users, ${customers.length} customers, ${projects.length} projects, ${leads.length} leads, ${documents.length} documents`);

    console.log('\nStep 2: Writing data to Neon database...');
    console.log('⚠️  Note: This will skip the 4 seeded users to avoid conflicts\n');

    // Write to Neon (skip seeded users)
    const seededEmails = ['admin@rayenna.com', 'sales@rayenna.com', 'operations@rayenna.com', 'finance@rayenna.com'];
    const usersToMigrate = users.filter(u => !seededEmails.includes(u.email));

    let migratedCounts = { users: 0, customers: 0, projects: 0, leads: 0, documents: 0 };

    // Migrate users (skip seeded ones)
    for (const user of usersToMigrate) {
      try {
        await neonPrisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            name: user.name,
            password: user.password,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        });
        migratedCounts.users++;
      } catch (error) {
        console.warn(`  ⚠️  Skipped user ${user.email}: ${error.message}`);
      }
    }

    // Migrate customers
    for (const customer of customers) {
      try {
        await neonPrisma.customer.upsert({
          where: { id: customer.id },
          update: {},
          create: customer,
        });
        migratedCounts.customers++;
      } catch (error) {
        console.warn(`  ⚠️  Skipped customer ${customer.customerId}: ${error.message}`);
      }
    }

    // Migrate projects (without relations first)
    for (const project of projects) {
      try {
        const { customer, salesperson, opsPerson, createdBy, ...projectData } = project;
        await neonPrisma.project.upsert({
          where: { id: project.id },
          update: {},
          create: projectData,
        });
        migratedCounts.projects++;
      } catch (error) {
        console.warn(`  ⚠️  Skipped project ${project.id}: ${error.message}`);
      }
    }

    // Migrate leads
    for (const lead of leads) {
      try {
        await neonPrisma.lead.upsert({
          where: { id: lead.id },
          update: {},
          create: lead,
        });
        migratedCounts.leads++;
      } catch (error) {
        console.warn(`  ⚠️  Skipped lead ${lead.id}: ${error.message}`);
      }
    }

    // Migrate documents
    for (const doc of documents) {
      try {
        await neonPrisma.document.upsert({
          where: { id: doc.id },
          update: {},
          create: doc,
        });
        migratedCounts.documents++;
      } catch (error) {
        console.warn(`  ⚠️  Skipped document ${doc.id}: ${error.message}`);
      }
    }

    console.log('\n=========================================');
    console.log('✅ Migration Summary:');
    console.log('=========================================');
    console.log(`  Users: ${migratedCounts.users} / ${usersToMigrate.length}`);
    console.log(`  Customers: ${migratedCounts.customers} / ${customers.length}`);
    console.log(`  Projects: ${migratedCounts.projects} / ${projects.length}`);
    console.log(`  Leads: ${migratedCounts.leads} / ${leads.length}`);
    console.log(`  Documents: ${migratedCounts.documents} / ${documents.length}`);
    console.log('=========================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    await localPrisma.$disconnect();
    await neonPrisma.$disconnect();
    rl.close();
  }
}

migrateData();
