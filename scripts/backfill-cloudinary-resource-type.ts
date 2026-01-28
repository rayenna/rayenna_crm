/**
 * One-time backfill: set cloudinaryResourceType for existing documents
 * where filePath is a full Cloudinary URL (parse /image/, /raw/, /video/ from path).
 */
import prisma from '../src/prisma';

async function main() {
  const docs = await prisma.document.findMany({
    where: {
      cloudinaryResourceType: null,
      filePath: { startsWith: 'http' },
    },
    select: { id: true, filePath: true },
  });

  let updated = 0;
  for (const doc of docs) {
    try {
      const pathLower = new URL(doc.filePath).pathname.toLowerCase();
      let resourceType: 'image' | 'raw' | 'video' = 'image';
      if (pathLower.includes('/raw/')) resourceType = 'raw';
      else if (pathLower.includes('/video/')) resourceType = 'video';

      await prisma.document.update({
        where: { id: doc.id },
        data: { cloudinaryResourceType: resourceType },
      });
      updated++;
      console.log(`Updated ${doc.id} -> ${resourceType}`);
    } catch (e) {
      console.error(`Skip ${doc.id}:`, e);
    }
  }

  console.log(`Backfill complete: ${updated} of ${docs.length} documents updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
