/**
 * Optional Solar Hub dev seed — NEVER run in production deploy scripts.
 *
 * Usage (explicit only):
 *   CONSUMER_SEED_PROJECT_ID=<project-cuid> npm run prisma:seed:consumer
 *
 * Or pick the first project automatically when ALLOW_CONSUMER_AUTO_SEED=1:
 *   ALLOW_CONSUMER_AUTO_SEED=1 npm run prisma:seed:consumer
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateReferralCode, tierFromPoints } from '../src/utils/consumerAuth';
import { consumerMasterContactFields } from '../src/utils/consumerCustomerProfile';
import { DEMO_HUB_USERNAME, normalizeUsername } from '../src/utils/consumerUsername';

const prisma = new PrismaClient();

const TEST_USERNAME = DEMO_HUB_USERNAME;
const TEST_EMAIL = 'hub.demo@rayenna.local';
const TEST_PASSWORD = 'hubdemo123';

async function main() {
  const projectId = process.env.CONSUMER_SEED_PROJECT_ID?.trim();
  const allowAuto = process.env.ALLOW_CONSUMER_AUTO_SEED === '1';

  let project = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: { customer: true },
      })
    : null;

  if (!project && allowAuto) {
    project = await prisma.project.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });
  }

  if (!project) {
    console.error(
      'No project selected. Set CONSUMER_SEED_PROJECT_ID to an existing project id,',
    );
    console.error('or set ALLOW_CONSUMER_AUTO_SEED=1 to use the newest project.');
    process.exit(1);
  }

  const existing = await prisma.consumerUser.findUnique({
    where: { projectId: project.id },
  });
  if (existing) {
    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    const contactFields = consumerMasterContactFields(project.customer);
    const updated = await prisma.consumerUser.update({
      where: { id: existing.id },
      data: {
        username: normalizeUsername(TEST_USERNAME),
        isActive: true,
        password,
        email: contactFields.email ?? TEST_EMAIL,
        phone: contactFields.phone,
        firstName: project.customer.firstName,
        lastName: project.customer.lastName,
      },
    });
    console.log('Refreshed Solar Hub demo consumer:');
    console.log('  projectId:', project.id);
    console.log('  username:', updated.username);
    console.log('  password:', TEST_PASSWORD);
    return;
  }

  const nameSeed =
    project.customer.firstName || project.customer.customerName || 'RAYENNA';
  const referralCode = generateReferralCode(nameSeed);
  const password = await bcrypt.hash(TEST_PASSWORD, 10);

  const contactFields = consumerMasterContactFields(project.customer);
  const consumer = await prisma.consumerUser.create({
    data: {
      username: normalizeUsername(TEST_USERNAME),
      email: contactFields.email ?? TEST_EMAIL,
      password,
      projectId: project.id,
      firstName: project.customer.firstName,
      lastName: project.customer.lastName,
      phone: contactFields.phone,
      referralCode,
      points: 0,
      memberTier: tierFromPoints(0),
    },
  });

  console.log('Created Solar Hub demo consumer:');
  console.log('  projectId:', project.id);
  console.log('  username:', TEST_USERNAME);
  console.log('  password:', TEST_PASSWORD);
  console.log('  id:      ', consumer.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
