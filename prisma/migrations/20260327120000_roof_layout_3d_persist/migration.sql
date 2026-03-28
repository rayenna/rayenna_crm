-- Persist 3D roof simulation separately from 2D layout; cross-device via same ProjectRoofLayout row.

ALTER TABLE "project_roof_layouts" ADD COLUMN IF NOT EXISTS "layoutImage3dUrl" TEXT;
ALTER TABLE "project_roof_layouts" ADD COLUMN IF NOT EXISTS "prefer3dForProposal" BOOLEAN NOT NULL DEFAULT false;
