/**
 * One-time backfill:
 * - set cloudinaryResourceType for existing documents where filePath is a full Cloudinary URL
 * - set cloudinaryFormat from URL/fileName extension when missing
 */
import prisma from '../src/prisma';

async function main() {
  const docs = await prisma.document.findMany({
    where: {
      OR: [
        { cloudinaryResourceType: null },
        { cloudinaryFormat: null },
      ],
    },
    select: { id: true, filePath: true, fileName: true, cloudinaryResourceType: true, cloudinaryFormat: true },
  });

  let updated = 0;
  for (const doc of docs) {
    try {
      let resourceType = doc.cloudinaryResourceType as 'image' | 'raw' | 'video' | null;
      let format = doc.cloudinaryFormat as string | null;

      if (!resourceType) {
        if (doc.filePath.startsWith('http')) {
          const pathLower = new URL(doc.filePath).pathname.toLowerCase();
          resourceType = 'image';
          if (pathLower.includes('/raw/')) resourceType = 'raw';
          else if (pathLower.includes('/video/')) resourceType = 'video';
        } else {
          // If we don't have a full URL to inspect, default to image (Cloudinary can store PDFs as image).
          resourceType = 'image';
        }
      }

      if (!format) {
        // Try from full URL
        if (doc.filePath.startsWith('http')) {
          const pathname = new URL(doc.filePath).pathname;
          const last = pathname.split('/').pop() || '';
          const dot = last.lastIndexOf('.');
          if (dot > -1 && dot < last.length - 1) {
            format = last.substring(dot + 1).toLowerCase();
          }
        }
        // Fallback from fileName (does not affect resource_type)
        if (!format) {
          const name = (doc.fileName || '').toLowerCase();
          const dot = name.lastIndexOf('.');
          if (dot > -1 && dot < name.length - 1) {
            format = name.substring(dot + 1);
          }
        }
        if (format && !/^[a-z0-9]{1,10}$/.test(format)) {
          format = null;
        }
      }

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          cloudinaryResourceType: resourceType,
          cloudinaryFormat: format,
        },
      });
      updated++;
      console.log(`Updated ${doc.id} -> type=${resourceType} format=${format ?? 'null'}`);
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
