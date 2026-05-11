# Frontend Pages Documentation

This document provides an overview of the frontend pages in the application, organized by user role and functionality.

## 1. Authentication Pages
These pages handle user access, account security, and identity.

| Page | Route | Responsibility | Key Features |
|------|-------|----------------|--------------|
| **Login** | `/login` | Authenticates users. | Email/password login, 2FA support, role-based redirection, dev bypass. |
| **Forgot Password** | `/forgot-password` | Initiates password recovery. | Email entry for reset link request. |
| **Reset Password** | `/reset-password` | Sets a new password. | Token-based password reset form. |
| **Setup Account** | `/setup-account` | Initial account activation. | Password setup for invited users. |
| **Unauthorized** | `/unauthorized` | Access denial notice. | Information for restricted access attempts. |

---

## 2. Woreda Admin Pages
The Woreda Admin has full control over the system, overseeing multiple Hibrets and members.

| Page | Route | Responsibility | Key Features |
|------|-------|----------------|--------------|
| **Dashboard** | `/woreda/dashboard` | High-level system overview. | Hibret performance charts, member demographics, directive submission rates, quick actions. |
| **Directives** | `/woreda/announcements` | Central directive management. | Create/publish directives, set deadlines, target specific Hibrets, attachment support, exports. |
| **Hibrets** | `/woreda/hibrets` | Hibret unit management. | Registry of Hibrets, political/administrative detail views, performance tracking. |
| **Members** | `/woreda/members` | Global member registry. | Advanced filtering, member import/export, profile management, status tracking. |
| **Admins** | `/woreda/admins` | Admin account control. | Create and manage Woreda/Hibret admin accounts, privilege assignment. |
| **Resources** | `/woreda/resources` | Document library management. | Upload and publish files for different roles, category management, archiving. |
| **Gallery** | `/woreda/gallery` | Media review. | View and review media/documents submitted by Hibrets in their reports. |
| **Broadcasts** | `/woreda/broadcasts` | News and articles. | Create and manage official communication posts for the feed. |
| **Chat** | `/woreda/chat` | Communication hub. | Real-time messaging with Hibret admins and members. |
| **Activity Log** | `/woreda/activity` | System audit trail. | Tracking administrative actions across directives, members, and accounts. |
| **Settings** | `/woreda/settings` | Admin settings. | Personal account configuration and system preferences. |

---

## 3. Hibret Admin Pages
Hibret Admins manage their specific unit and report back to the Woreda.

| Page | Route | Responsibility | Key Features |
|------|-------|----------------|--------------|
| **Dashboard** | `/hibret/dashboard` | Hibret-specific overview. | Summary of assigned directives, report status, and recent directives. |
| **Assigned Directives**| `/hibret/announcements` | Handling Woreda requests. | List of directives, status tracking (published/closed), deadline monitoring. |
| **Reports** | `/hibret/reports` | Directive reporting. | Drafting and submitting reports for directives, tracking Woreda review status. |
| **Broadcasts** | `/hibret/broadcasts` | Official feed. | Reading news and articles published by the Woreda for Hibret admins. |
| **Members** | `/hibret/members` | Local member management. | Registry of members within the Hibret, adding/importing members. |
| **Resources** | `/hibret/resources` | Operational library. | Accessing documents and files published for Hibret administration. |
| **Chat** | `/hibret/chat` | Messaging. | Real-time communication with Woreda administration. |
| **Settings** | `/hibret/settings` | Hibret admin settings. | Account and profile management. |

---

## 4. Member Pages
General members use these pages to manage their profile and access information.

| Page | Route | Responsibility | Key Features |
|------|-------|----------------|--------------|
| **Dashboard** | `/member/dashboard` | Personal overview. | Profile completion status, membership info, quick links to broadcasts/resources. |
| **Profile** | `/member/profile` | Membership data. | Detailed view and editing of personal, educational, and work information. |
| **Broadcasts** | `/member/broadcasts` | Official communications. | Reading articles and news published by the Woreda for members. |
| **Resources** | `/member/resources` | Personal library. | Accessing documents and files published for general members. |
| **Chat** | `/member/chat` | Support channel. | Messaging with system administrators. |
| **Settings** | `/member/settings` | Member settings. | Account security and preference management. |
| **Forms** | `/member/forms` | (Placeholder) Forms. | Future implementation for member-specific form submissions. |

---

## 5. Shared Pages
Components or pages used across multiple roles with similar logic.

| Page | Route | Responsibility | Key Features |
|------|-------|----------------|--------------|
| **Users Management** | `/woreda/users`, `/hibret/users`| Account control. | Managing login status (Active/Disabled/Pending) for member accounts. |
