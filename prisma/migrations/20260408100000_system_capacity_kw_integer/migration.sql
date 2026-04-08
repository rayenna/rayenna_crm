-- System capacity (kW) is stored as whole numbers only; round any legacy fractional values.
ALTER TABLE "projects" ALTER COLUMN "systemCapacity" TYPE INTEGER USING (
  CASE
    WHEN "systemCapacity" IS NULL THEN NULL
    ELSE (ROUND("systemCapacity"::numeric))::integer
  END
);
