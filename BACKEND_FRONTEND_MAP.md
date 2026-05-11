# Backend → Frontend API Map (Astedader Woreda)

This document maps the existing backend API routes (in `./backend/src/app.ts`) to the React frontend service modules (in `./frontend/src/services/*`). It is intended to keep the frontend aligned with the backend without changing backend behavior.

## Conventions

- Auth: `Authorization: Bearer <token>` for normal API calls.
- Query token support: backend `authMiddleware` allows `?token=<jwt>` only for browser-opened `/files/*` and `*export*` / preview / download endpoints. The frontend should generate links with `?token=` for downloads/exports that open in a new tab.
- Roles: `WOREDA_ADMIN`, `HIBRET_ADMIN`, `MEMBER`
- Privileges: backend checks `req.user.privileges` and treats `"*"` as super-privilege.

## Base / Health

- `GET /health`
  - Frontend usage: optional health check / diagnostics (not required for normal UI).

## Auth (`/auth/*`) → `authService.ts`

- `POST /auth/login`
  - Request: `{ email, password }`
  - Response: `{ twoFactorRequired: true, twoFactorToken, previewUrl?, message? }`
- `POST /auth/login/2fa`
  - Request: `{ twoFactorToken, code }`
  - Response: `{ token, user }`
- `GET /auth/me`
  - Response: `{ user }`
- `POST /auth/forgot-password`
  - Request: `{ email }`
  - Response: `{ message, previewUrl? }`
- `GET /auth/reset-token/:token`
  - Response: `{ account: { email } }`
- `POST /auth/reset-password`
  - Request: `{ token, password }`
  - Response: `{ message }`
- `GET /auth/setup-token/:token`
  - Response: `{ account: { email, role, memberName, hibretName } }`
- `POST /auth/setup-account`
  - Request: `{ token, password }`
  - Response: `{ token, user }`
- `POST /auth/change-password`
  - Request: `{ currentPassword, newPassword }`
  - Response: `{ message }`
- `GET /auth/2fa/status`
- `POST /auth/2fa/request`
- `POST /auth/2fa/enable`
- `POST /auth/2fa/disable`

## Dashboard (`/woreda/dashboard`) → `analyticsService.ts` / `dashboardService.ts`

- `GET /woreda/dashboard`
  - Woreda-only, privilege `woreda_analytics.read` or `analytics.read`
  - Response includes:
    - Hibret rows with member counts, targeted directives, pending/submitted reports, attendance and performance scores
    - Recent directives
    - Member distribution summaries (gender, age, education, etc.)

## Announcements / Directives (`/announcements/*`) → `announcementService.ts`

Requires `authMiddleware` and privilege checks:

- `GET /announcements`
  - Query: `page,pageSize,search,type,status,dateFrom,dateTo`
  - Response: `{ announcements, pagination, summary }`
- `POST /announcements`
  - Body (Zod): `title,type,instructions,deadline?,attendanceRequired?,targetHibretIds[]`
  - Response: `{ announcement }`
- `POST /announcements/:announcementId/attachments`
  - Body: `{ fileIds: string[] }`
  - Response: `{ announcement }`
- `GET /announcements/:announcementId`
  - Response: `{ announcement }` with targets, reports, attachments
- `PATCH /announcements/:announcementId`
  - Draft-only updates
  - Response: `{ announcement }`
- `POST /announcements/:announcementId/publish`
  - Response: `{ announcement }` and creates notifications for targeted hibrets
- `POST /announcements/:announcementId/close`
  - Response: `{ announcement }`
- `GET /announcements/:announcementId/hibrets/:hibretId/report`
  - Privilege: `announcement.review`
  - Response: `{ report }` with announcement, hibret, attachments, review history
- `POST /announcements/:announcementId/hibrets/:hibretId/report/review`
  - Privilege: `announcement.review`
  - Body: `{ decision: 'approved'|'rejected'|'changes_requested', comment? }`
  - Response: `{ report }` and notifies hibret

## Hibret Portal (Assigned directives + reports) → `reportService.ts` / `announcementService.ts`

Hibret-only routes live under `report.routes.ts` (mounted at `/`):

- `GET /hibret/announcements`
  - Returns assigned announcements for the current Hibret admin
  - Response: `{ announcements, pagination, summary }`
- `GET /hibret/announcements/:announcementId`
  - Response: `{ announcement }` for the Hibret scope

Reports:

- `GET /hibret/reports`
  - Response: `{ reports }`
- `GET /hibret/reports/:reportId`
  - Response: `{ report }`
- `POST /hibret/announcements/:announcementId/report`
  - Upsert draft report for current Hibret
  - Body: `{ title, summary?, body }`
  - Response: `{ report }`
- `PATCH /hibret/reports/:reportId`
  - Draft / changes_requested only
  - Body: `{ title, summary?, body }`
  - Response: `{ report }`
- `POST /hibret/reports/:reportId/attachments`
  - Privilege: `media.upload`
  - Body: `{ fileIds: string[] }`
  - Response: `{ report }`
- `POST /hibret/reports/:reportId/submit`
  - Privilege: `report.submit`
  - Enforces attendance completion if directive requires it
  - Response: `{ report }` and notifies Woreda admins

Woreda report access:

- `GET /woreda/reports`
  - Response: `{ reports }`
- `GET /woreda/announcements/:announcementId/hibrets/:hibretId/report`
  - Response: `{ report }`
- `POST /woreda/reports/:reportId/review`
  - Body: `{ decision, comment? }`
  - Response: `{ report }`

## Attendance → `activityService.ts` (attendance) / `reportService.ts`

- `GET /hibret/announcements/:announcementId/attendance`
  - Response: `{ attendance }` with member list + summary
- `POST /hibret/announcements/:announcementId/attendance`
  - Body: `{ records: [{ memberId, status: 'present'|'absent'|'excused', note? }] }`
  - Response: `{ attendance }`
  - Locked after report submission
- `GET /woreda/announcements/:announcementId/hibrets/:hibretId/attendance`
  - Response: `{ attendance }`

## Hibrets (Woreda administration) (`/hibrets/*`) → `hibretService.ts`

- `GET /hibrets`
  - Response: `{ hibrets: [...] }` with computed counts and recent directives
- `POST /hibrets`
- `GET /hibrets/:hibretId`
  - Response: `{ hibret }` includes:
    - counts
    - admins (users)
    - members (with hibret/family + account status)
    - directives with per-directive report summaries
    - reports summaries
    - families (including per-family member list)
- `PATCH /hibrets/:hibretId`

Account status tools:

- `PATCH /hibrets/:hibretId/accounts/status` (bulk)
- `PATCH /hibrets/:hibretId/accounts/:userId/status` (single)

Families (under Hibret, not a top-level Woreda entity page):

- `POST /hibrets/:hibretId/families`
- `PATCH /hibrets/:hibretId/families/:familyId`
- `DELETE /hibrets/:hibretId/families/:familyId`
- `POST /hibrets/:hibretId/families/:familyId/members` (assign)
- `POST /hibrets/:hibretId/families/unassign-members`

## Members (`/members/*`) → `memberService.ts` / `adminService.ts`

- `GET /members/form-options`
  - Response: `{ options: { hibrets, families } }`
- `GET /members`
  - Query: `page,pageSize,search,hibretId,familyId,gender,accountStatus,...`
  - Response: `{ summary, pagination, members }`
- `POST /members`
- `GET /members/:memberId`
  - Response: `{ member }` with attendance history (directive titles etc.)
- `PATCH /members/:memberId`

Member account management:

- `POST /members/:memberId/account` (create MEMBER login)
- `POST /members/:memberId/account/resend-setup`
- `PATCH /members/:memberId/account/status`
- `POST /members/accounts/bulk-create`

Member self profile (MEMBER role):

- `GET /members/me/profile`
- `PATCH /members/me/profile`

Analytics:

- `GET /members/analytics`

Imports:

- `POST /members/import/preview`
- `POST /members/import/commit`

## Admins (`/admins/*`) → `adminService.ts`

- `GET /admins/form-options`
  - Response includes available privileges and hibret options
- `GET /admins`
- `POST /admins`
- `GET /admins/:adminId`
- `PATCH /admins/:adminId`
- `PATCH /admins/:adminId/status`
- `POST /admins/:adminId/resend-setup`

## Users (`/users/*`) → `adminService.ts` / `authService.ts`

- `GET /users` (member accounts list)
- `PATCH /users/:userId/status`
- `PATCH /users/bulk/status`

## Resources (`/resources/*`) → `resourceService.ts`

- `GET /resources`
- `POST /resources`
- `PATCH /resources/:resourceId`
- `POST /resources/:resourceId/publish`
- `POST /resources/:resourceId/archive`
- `DELETE /resources/:resourceId`

## Broadcasts (`/broadcasts/*`) → `broadcastService.ts`

- `GET /broadcasts`
- `POST /broadcasts`
- `GET /broadcasts/:broadcastId`
- `PATCH /broadcasts/:broadcastId`
- `POST /broadcasts/:broadcastId/publish`
- `POST /broadcasts/:broadcastId/archive`
- `DELETE /broadcasts/:broadcastId`

## Files (`/files/*`) → `fileService.ts`

Uploads:

- `POST /files/upload/announcement` (form-data `file`)
- `POST /files/upload/broadcast` (form-data `file`)
- `POST /files/upload/resource` (form-data `file`)
- `POST /files/upload/report` (form-data `file`)
- `POST /files/upload/member` (form-data `file`, must be image)

Preview/Download:

- `GET /files/:fileId/preview` (HTML preview page; requires token via header or `?token=`)
- `GET /files/:fileId/download` (binary; `?inline=true` supported; requires token via header or `?token=`)

## Gallery (`/gallery/*`) → `galleryService.ts`

- `GET /gallery/report-albums`
  - Query: `search, hibretId, reviewStatus, mediaType`
  - Response: `{ albums, hibrets, summary }`
- `GET /gallery/report-albums/:reportId`
  - Response: `{ album }`

## Exports (`/announcements/*export*`, `/woreda/*export*`, `/hibret/*export*`) → `analyticsService.ts` / `reportService.ts`

CSV/ZIP/HTML endpoints (all require auth; safe to open with `?token=`):

- `GET /announcements/export.csv`
- `GET /announcements/:announcementId/reports.csv`
- `GET /announcements/:announcementId/export.zip`
- `GET /woreda/reports/:reportId/export.html`
- `GET /woreda/reports/:reportId/package.zip`
- `GET /hibret/reports/:reportId/export.html`
- `GET /hibret/reports/:reportId/package.zip`
- `GET /woreda/reports/:reportId/attachments.zip`
- `GET /woreda/reports/:reportId/export.zip`
- `GET /announcements/export.pdf`
- `GET /announcements/:announcementId/reports.pdf`
- `GET /woreda/announcements/:announcementId/hibrets/:hibretId/attendance.csv`
- `GET /woreda/announcements/:announcementId/hibrets/:hibretId/attendance.xlsx`

## Notifications (`/notifications/*`) → `notificationService.ts`

- `GET /notifications`
  - Response: `{ notifications: AppNotification[] }` (includes derived `isUnread`)
- `PATCH /notifications/read-all`
- `PATCH /notifications/:notificationId/read`

## Activity (`/activity/*`) → `activityService.ts`

- `GET /activity`
- `GET /activity/summary`

## Chat (`/chat/*` and Socket.IO) → `chatService.ts`

- REST routes under `/chat` (registered in `server.ts`)
- Socket.IO connection is registered in backend and is required for real-time messaging

