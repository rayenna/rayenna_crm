-- Persist editable 2D geometry (polygon, panels, keepouts) for cross-device roof layout editing.
ALTER TABLE "project_roof_layouts"
  ADD COLUMN IF NOT EXISTS "geometryJson" JSONB;
