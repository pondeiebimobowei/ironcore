-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "title" TEXT,
ADD COLUMN "descriptionHtml" TEXT,
ADD COLUMN "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';

UPDATE "Task"
SET "title" = CASE "type"
  WHEN 'VERIFY_PAYMENT' THEN 'Verify payment'
  WHEN 'FOLLOW_UP_MEMBER' THEN 'Follow up with member'
  WHEN 'RESOLVE_OVERDUE_STATUS' THEN 'Resolve overdue status'
  WHEN 'REVIEW_AT_RISK_MEMBER' THEN 'Review at-risk member'
  WHEN 'REACTIVATION' THEN 'Start reactivation'
  ELSE 'Recovery task'
END
WHERE "title" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "title" SET NOT NULL;
