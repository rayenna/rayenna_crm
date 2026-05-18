-- Persist satellite base image URL (Cloudinary) so 2D editor survives Render disk loss.
ALTER TABLE "project_roof_layouts" ADD COLUMN IF NOT EXISTS "satelliteImageUrl" TEXT;
