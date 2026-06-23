-- Add isEstimated flag to distinguish auto-estimated vs admin-entered readings
ALTER TABLE "consumer_energy_readings" ADD COLUMN "isEstimated" BOOLEAN NOT NULL DEFAULT true;
