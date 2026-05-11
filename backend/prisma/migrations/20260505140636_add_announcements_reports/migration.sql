-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('meeting', 'conference', 'trend_report', 'other');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'changes_requested');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('approved', 'rejected', 'changes_requested');

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "instructions" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'draft',
    "deadline" TIMESTAMP(3),
    "attendanceRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTarget" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "category" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HibretReport" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewDecision" "ReviewDecision",
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HibretReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAttachment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportReview" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewerUserId" TEXT,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "Announcement"("type");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_deadline_idx" ON "Announcement"("deadline");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_announcementId_idx" ON "AnnouncementTarget"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_hibretId_idx" ON "AnnouncementTarget"("hibretId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementTarget_announcementId_hibretId_key" ON "AnnouncementTarget"("announcementId", "hibretId");

-- CreateIndex
CREATE INDEX "FileRecord_category_idx" ON "FileRecord"("category");

-- CreateIndex
CREATE INDEX "FileRecord_uploadedById_idx" ON "FileRecord"("uploadedById");

-- CreateIndex
CREATE INDEX "FileRecord_createdAt_idx" ON "FileRecord"("createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementAttachment_fileId_idx" ON "AnnouncementAttachment"("fileId");

-- CreateIndex
CREATE INDEX "HibretReport_announcementId_idx" ON "HibretReport"("announcementId");

-- CreateIndex
CREATE INDEX "HibretReport_hibretId_idx" ON "HibretReport"("hibretId");

-- CreateIndex
CREATE INDEX "HibretReport_status_idx" ON "HibretReport"("status");

-- CreateIndex
CREATE INDEX "HibretReport_reviewDecision_idx" ON "HibretReport"("reviewDecision");

-- CreateIndex
CREATE UNIQUE INDEX "HibretReport_announcementId_hibretId_key" ON "HibretReport"("announcementId", "hibretId");

-- CreateIndex
CREATE INDEX "ReportAttachment_reportId_idx" ON "ReportAttachment"("reportId");

-- CreateIndex
CREATE INDEX "ReportAttachment_fileId_idx" ON "ReportAttachment"("fileId");

-- CreateIndex
CREATE INDEX "ReportReview_reportId_idx" ON "ReportReview"("reportId");

-- CreateIndex
CREATE INDEX "ReportReview_decision_idx" ON "ReportReview"("decision");

-- CreateIndex
CREATE INDEX "ReportReview_createdAt_idx" ON "ReportReview"("createdAt");

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_hibretId_fkey" FOREIGN KEY ("hibretId") REFERENCES "Hibret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HibretReport" ADD CONSTRAINT "HibretReport_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HibretReport" ADD CONSTRAINT "HibretReport_hibretId_fkey" FOREIGN KEY ("hibretId") REFERENCES "Hibret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HibretReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttachment" ADD CONSTRAINT "ReportAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportReview" ADD CONSTRAINT "ReportReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "HibretReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
