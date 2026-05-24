-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAFT');

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN "workflowDefinitionId" TEXT;

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "trigger" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos (WAT)',
    "startedAt" TIMESTAMP(3),
    "lastEditedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinitionStep" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "dayOffset" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "createsTask" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinitionStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_workflowDefinitionId_idx" ON "Workflow"("workflowDefinitionId");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_organizationId_idx" ON "WorkflowDefinition"("organizationId");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_organizationId_status_idx" ON "WorkflowDefinition"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_organizationId_category_idx" ON "WorkflowDefinition"("organizationId", "category");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_lastEditedById_idx" ON "WorkflowDefinition"("lastEditedById");

-- CreateIndex
CREATE INDEX "WorkflowDefinitionStep_workflowDefinitionId_idx" ON "WorkflowDefinitionStep"("workflowDefinitionId");

-- CreateIndex
CREATE INDEX "WorkflowDefinitionStep_workflowDefinitionId_sortOrder_idx" ON "WorkflowDefinitionStep"("workflowDefinitionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowDefinitionStep" ADD CONSTRAINT "WorkflowDefinitionStep_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
