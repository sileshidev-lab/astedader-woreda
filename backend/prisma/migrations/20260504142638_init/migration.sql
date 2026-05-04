-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('woreda_admin', 'hibret_admin', 'family_admin', 'member');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending_setup', 'active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('draft', 'published', 'closed');

-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'changes_requested');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('attended', 'not_attended', 'excused');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('woreda', 'hibret', 'family');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('short_text', 'long_text', 'number', 'date', 'dropdown', 'checkbox', 'radio', 'file');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'pending_setup',
    "privileges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hibretId" TEXT,
    "familyId" TEXT,
    "memberId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hibret" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hibret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "familyAdminUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "memberCode" TEXT,
    "fanId" TEXT,
    "ppId" TEXT,
    "firstName" TEXT NOT NULL,
    "fatherName" TEXT NOT NULL,
    "grandfatherName" TEXT,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "email" TEXT,
    "hibretId" TEXT NOT NULL,
    "familyId" TEXT,
    "membershipStatus" TEXT,
    "registrationType" TEXT,
    "membershipYear" INTEGER,
    "partyRole" TEXT,
    "educationLevel" TEXT,
    "fieldOfStudy" TEXT,
    "workplace" TEXT,
    "workType" TEXT,
    "workExperienceYears" INTEGER,
    "zone" TEXT,
    "kebele" TEXT,
    "ethnicity" TEXT,
    "healthStatus" TEXT,
    "photoFileId" TEXT,
    "profileCompletion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'draft',
    "deadline" TIMESTAMP(3),
    "allowAttendance" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
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
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HibretResponse" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "challenges" TEXT,
    "status" "ResponseStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HibretResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HibretResponseAttachment" (
    "id" TEXT NOT NULL,
    "hibretResponseId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HibretResponseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HibretAttendance" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HibretAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyAssignment" (
    "id" TEXT NOT NULL,
    "hibretId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'draft',
    "deadline" TIMESTAMP(3),
    "allowAttendance" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyAssignmentAttachment" (
    "id" TEXT NOT NULL,
    "familyAssignmentId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyAssignmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyResponse" (
    "id" TEXT NOT NULL,
    "familyAssignmentId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT,
    "challenges" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyResponseAttachment" (
    "id" TEXT NOT NULL,
    "familyResponseId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyResponseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyAttendance" (
    "id" TEXT NOT NULL,
    "familyAssignmentId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "note" TEXT,
    "recordedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "hibretId" TEXT,
    "fileAssetId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "hibretId" TEXT,
    "familyId" TEXT,
    "announcementId" TEXT,
    "hibretResponseId" TEXT,
    "familyAssignmentId" TEXT,
    "familyResponseId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "hibretId" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'draft',
    "targetType" TEXT NOT NULL DEFAULT 'all',
    "createdByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastTarget" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "hibretId" TEXT,
    "familyId" TEXT,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastAttachment" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "hibretId" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'draft',
    "deadline" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormTarget" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "role" TEXT,
    "hibretId" TEXT,
    "familyId" TEXT,
    "memberId" TEXT,

    CONSTRAINT "FormTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "memberId" TEXT,
    "familyId" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB,
    "fileAssetId" TEXT,

    CONSTRAINT "FormAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fileAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "operation" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "targetType" TEXT,
    "targetId" TEXT,
    "payload" JSONB NOT NULL,
    "reviewNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "fileId" TEXT,
    "summary" JSONB,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending_approval',
    "requestedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "filters" JSONB,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_hibretId_idx" ON "User"("hibretId");

-- CreateIndex
CREATE INDEX "User_familyId_idx" ON "User"("familyId");

-- CreateIndex
CREATE INDEX "User_memberId_idx" ON "User"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "SetupToken_tokenHash_key" ON "SetupToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SetupToken_userId_idx" ON "SetupToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Hibret_name_key" ON "Hibret"("name");

-- CreateIndex
CREATE INDEX "Family_hibretId_idx" ON "Family"("hibretId");

-- CreateIndex
CREATE INDEX "Family_familyAdminUserId_idx" ON "Family"("familyAdminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_name_hibretId_key" ON "Family"("name", "hibretId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_memberCode_key" ON "Member"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Member_fanId_key" ON "Member"("fanId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_ppId_key" ON "Member"("ppId");

-- CreateIndex
CREATE INDEX "Member_hibretId_idx" ON "Member"("hibretId");

-- CreateIndex
CREATE INDEX "Member_familyId_idx" ON "Member"("familyId");

-- CreateIndex
CREATE INDEX "Member_gender_idx" ON "Member"("gender");

-- CreateIndex
CREATE INDEX "Member_membershipStatus_idx" ON "Member"("membershipStatus");

-- CreateIndex
CREATE INDEX "FileAsset_uploadedByUserId_idx" ON "FileAsset"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "Announcement"("type");

-- CreateIndex
CREATE INDEX "Announcement_deadline_idx" ON "Announcement"("deadline");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_announcementId_idx" ON "AnnouncementTarget"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementTarget_hibretId_idx" ON "AnnouncementTarget"("hibretId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementTarget_announcementId_hibretId_key" ON "AnnouncementTarget"("announcementId", "hibretId");

-- CreateIndex
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

-- CreateIndex
CREATE INDEX "HibretResponse_announcementId_idx" ON "HibretResponse"("announcementId");

-- CreateIndex
CREATE INDEX "HibretResponse_hibretId_idx" ON "HibretResponse"("hibretId");

-- CreateIndex
CREATE INDEX "HibretResponse_status_idx" ON "HibretResponse"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HibretResponse_announcementId_hibretId_key" ON "HibretResponse"("announcementId", "hibretId");

-- CreateIndex
CREATE INDEX "HibretResponseAttachment_hibretResponseId_idx" ON "HibretResponseAttachment"("hibretResponseId");

-- CreateIndex
CREATE INDEX "HibretAttendance_announcementId_idx" ON "HibretAttendance"("announcementId");

-- CreateIndex
CREATE INDEX "HibretAttendance_hibretId_idx" ON "HibretAttendance"("hibretId");

-- CreateIndex
CREATE INDEX "HibretAttendance_memberId_idx" ON "HibretAttendance"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "HibretAttendance_announcementId_hibretId_memberId_key" ON "HibretAttendance"("announcementId", "hibretId", "memberId");

-- CreateIndex
CREATE INDEX "FamilyAssignment_hibretId_idx" ON "FamilyAssignment"("hibretId");

-- CreateIndex
CREATE INDEX "FamilyAssignment_familyId_idx" ON "FamilyAssignment"("familyId");

-- CreateIndex
CREATE INDEX "FamilyAssignment_status_idx" ON "FamilyAssignment"("status");

-- CreateIndex
CREATE INDEX "FamilyAssignmentAttachment_familyAssignmentId_idx" ON "FamilyAssignmentAttachment"("familyAssignmentId");

-- CreateIndex
CREATE INDEX "FamilyResponse_familyAssignmentId_idx" ON "FamilyResponse"("familyAssignmentId");

-- CreateIndex
CREATE INDEX "FamilyResponse_familyId_idx" ON "FamilyResponse"("familyId");

-- CreateIndex
CREATE INDEX "FamilyResponse_status_idx" ON "FamilyResponse"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyResponse_familyAssignmentId_familyId_key" ON "FamilyResponse"("familyAssignmentId", "familyId");

-- CreateIndex
CREATE INDEX "FamilyResponseAttachment_familyResponseId_idx" ON "FamilyResponseAttachment"("familyResponseId");

-- CreateIndex
CREATE INDEX "FamilyAttendance_familyAssignmentId_idx" ON "FamilyAttendance"("familyAssignmentId");

-- CreateIndex
CREATE INDEX "FamilyAttendance_familyId_idx" ON "FamilyAttendance"("familyId");

-- CreateIndex
CREATE INDEX "FamilyAttendance_memberId_idx" ON "FamilyAttendance"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyAttendance_familyAssignmentId_familyId_memberId_key" ON "FamilyAttendance"("familyAssignmentId", "familyId", "memberId");

-- CreateIndex
CREATE INDEX "Resource_sourceType_idx" ON "Resource"("sourceType");

-- CreateIndex
CREATE INDEX "Resource_hibretId_idx" ON "Resource"("hibretId");

-- CreateIndex
CREATE INDEX "GalleryItem_hibretId_idx" ON "GalleryItem"("hibretId");

-- CreateIndex
CREATE INDEX "GalleryItem_familyId_idx" ON "GalleryItem"("familyId");

-- CreateIndex
CREATE INDEX "GalleryItem_mediaType_idx" ON "GalleryItem"("mediaType");

-- CreateIndex
CREATE INDEX "Broadcast_sourceType_idx" ON "Broadcast"("sourceType");

-- CreateIndex
CREATE INDEX "Broadcast_hibretId_idx" ON "Broadcast"("hibretId");

-- CreateIndex
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");

-- CreateIndex
CREATE INDEX "BroadcastTarget_broadcastId_idx" ON "BroadcastTarget"("broadcastId");

-- CreateIndex
CREATE INDEX "BroadcastTarget_hibretId_idx" ON "BroadcastTarget"("hibretId");

-- CreateIndex
CREATE INDEX "BroadcastTarget_familyId_idx" ON "BroadcastTarget"("familyId");

-- CreateIndex
CREATE INDEX "BroadcastTarget_memberId_idx" ON "BroadcastTarget"("memberId");

-- CreateIndex
CREATE INDEX "BroadcastAttachment_broadcastId_idx" ON "BroadcastAttachment"("broadcastId");

-- CreateIndex
CREATE INDEX "Form_sourceType_idx" ON "Form"("sourceType");

-- CreateIndex
CREATE INDEX "Form_hibretId_idx" ON "Form"("hibretId");

-- CreateIndex
CREATE INDEX "Form_status_idx" ON "Form"("status");

-- CreateIndex
CREATE INDEX "FormField_formId_idx" ON "FormField"("formId");

-- CreateIndex
CREATE INDEX "FormTarget_formId_idx" ON "FormTarget"("formId");

-- CreateIndex
CREATE INDEX "FormTarget_hibretId_idx" ON "FormTarget"("hibretId");

-- CreateIndex
CREATE INDEX "FormTarget_familyId_idx" ON "FormTarget"("familyId");

-- CreateIndex
CREATE INDEX "FormTarget_memberId_idx" ON "FormTarget"("memberId");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_submittedByUserId_idx" ON "FormSubmission"("submittedByUserId");

-- CreateIndex
CREATE INDEX "FormSubmission_memberId_idx" ON "FormSubmission"("memberId");

-- CreateIndex
CREATE INDEX "FormSubmission_familyId_idx" ON "FormSubmission"("familyId");

-- CreateIndex
CREATE INDEX "FormSubmission_status_idx" ON "FormSubmission"("status");

-- CreateIndex
CREATE INDEX "FormAnswer_submissionId_idx" ON "FormAnswer"("submissionId");

-- CreateIndex
CREATE INDEX "FormAnswer_fieldId_idx" ON "FormAnswer"("fieldId");

-- CreateIndex
CREATE INDEX "ChatParticipant_threadId_idx" ON "ChatParticipant"("threadId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_threadId_userId_key" ON "ChatParticipant"("threadId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_idx" ON "ChatMessage"("threadId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderUserId_idx" ON "ChatMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");

-- CreateIndex
CREATE INDEX "ActivityLog_operation_idx" ON "ActivityLog"("operation");

-- CreateIndex
CREATE INDEX "ActivityLog_targetType_idx" ON "ActivityLog"("targetType");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedByUserId_idx" ON "ApprovalRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_type_idx" ON "ApprovalRequest"("type");

-- CreateIndex
CREATE INDEX "ImportJob_requestedByUserId_idx" ON "ImportJob"("requestedByUserId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ExportJob_requestedByUserId_idx" ON "ExportJob"("requestedByUserId");

-- CreateIndex
CREATE INDEX "ExportJob_status_idx" ON "ExportJob"("status");
