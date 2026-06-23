import { seedConsumerHelpFromRepo } from '../src/services/consumerHelpSeedService';

async function main() {
  const summary = await seedConsumerHelpFromRepo();
  console.log('Consumer help seed complete:');
  console.log('  articles:', summary.articlesUpserted);
  console.log('  faqs:    ', summary.faqsUpserted);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    const { default: prisma } = await import('../src/prisma');
    await prisma.$disconnect();
  });
