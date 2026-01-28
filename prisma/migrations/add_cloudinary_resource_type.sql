-- Add Cloudinary resource_type column (image | raw | video). Run this if migrate dev fails.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "cloudinaryResourceType" TEXT;
