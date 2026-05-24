-- AlterTable
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;

UPDATE "User"
SET "fullName" = COALESCE(NULLIF(SPLIT_PART("email", '@', 1), ''), 'Account owner')
WHERE "fullName" IS NULL;

ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "tagline" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "establishedYear" INTEGER,
ADD COLUMN "businessType" TEXT,
ADD COLUMN "organizationSize" TEXT,
ADD COLUMN "websiteUrl" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "primaryPhone" TEXT,
ADD COLUMN "secondaryPhone" TEXT,
ADD COLUMN "addressLine" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "state" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "businessHours" JSONB,
ADD COLUMN "closedOnPublicHolidays" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
