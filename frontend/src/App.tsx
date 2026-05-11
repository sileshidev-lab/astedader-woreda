import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./i18n";

import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SetupPasswordPage } from "./pages/auth/SetupPasswordPage";
import { UnauthorizedPage } from "./pages/auth/UnauthorizedPage";

import { UsersPage } from "./pages/shared/users/UsersPage";

import { WoredaLayout } from "./components/layout/WoredaLayout";
import { HibretLayout } from "./components/layout/HibretLayout";
import { MemberLayout } from "./components/layout/MemberLayout";

import { AnnouncementsPage } from "./pages/woreda/announcements/AnnouncementsPage";
import { AnnouncementDetailPage } from "./pages/woreda/announcements/AnnouncementDetailPage";
import { WoredaReportReviewPage } from "./pages/woreda/announcements/WoredaReportReviewPage";
import { HibretsPage } from "./pages/woreda/hibrets/HibretsPage";
import { HibretDetailPage } from "./pages/woreda/hibrets/HibretDetailPage";
import { MembersPage } from "./pages/woreda/members/MembersPage";
import { MemberDetailPage } from "./pages/woreda/members/MemberDetailPage";
import { AdminsPage } from "./pages/woreda/admins/AdminsPage";
import { AdminDetailPage } from "./pages/woreda/admins/AdminDetailPage";
import { ResourcesPage } from "./pages/woreda/resources/ResourcesPage";
import { GalleryPage } from "./pages/woreda/gallery/GalleryPage";
import { BroadcastsPage } from "./pages/woreda/broadcasts/BroadcastsPage";
import { BroadcastEditorPage } from "./pages/woreda/broadcasts/BroadcastEditorPage";
import { BroadcastDetailPage } from "./pages/woreda/broadcasts/BroadcastDetailPage";
import { ChatPage } from "./pages/woreda/chat/ChatPage";
import { ActivityPage } from "./pages/woreda/activity/ActivityPage";
import { AdminActivityDetailPage } from "./pages/woreda/activity/AdminActivityDetailPage";
import { WoredaDashboardPage } from "./pages/woreda/dashboard/WoredaDashboardPage";
import { HibretPoliticalPage } from "./pages/woreda/hibrets/HibretPoliticalPage";
import { HibretAdministrativePage } from "./pages/woreda/hibrets/HibretAdministrativePage";

import { HibretAnnouncementsPage } from "./pages/hibret/announcements/HibretAnnouncementsPage";
import { HibretAnnouncementDetailPage } from "./pages/hibret/announcements/HibretAnnouncementDetailPage";
import { HibretBroadcastsPage } from "./pages/hibret/broadcasts/HibretBroadcastsPage";
import { HibretBroadcastDetailPage } from "./pages/hibret/broadcasts/HibretBroadcastDetailPage";
import { HibretChatPage } from "./pages/hibret/chat/HibretChatPage";
import { HibretResourcesPage } from "./pages/hibret/resources/HibretResourcesPage";
import { HibretMembersPage } from "./pages/hibret/members/HibretMembersPage";
import { HibretMemberDetailPage } from "./pages/hibret/members/HibretMemberDetailPage";
import { HibretDashboardPage } from "./pages/hibret/HibretDashboardPage";
import { HibretReportsPage } from "./pages/hibret/reports/HibretReportsPage";
import { HibretReportDetailPage } from "./pages/hibret/reports/HibretReportDetailPage";
import { HibretSettingsPage } from "./pages/hibret/settings/HibretSettingsPage";

import { MemberBroadcastsPage } from "./pages/member/broadcasts/MemberBroadcastsPage";
import { MemberBroadcastDetailPage } from "./pages/member/broadcasts/MemberBroadcastDetailPage";
import { MemberResourcesPage } from "./pages/member/resources/MemberResourcesPage";
import { MemberProfilePage } from "./pages/member/profile/MemberProfilePage";
import { MemberChatPage } from "./pages/member/chat/MemberChatPage";
import { MemberDashboardPage } from "./pages/member/MemberDashboardPage";
import { MemberFormsPage } from "./pages/member/forms/MemberFormsPage";
import { MemberFormDetailPage } from "./pages/member/forms/MemberFormDetailPage";
import { MemberSettingsPage } from "./pages/member/settings/MemberSettingsPage";
import { SettingsPage as WoredaSettingsPage } from "./pages/woreda/settings/SettingsPage";

import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RoleRoute } from "./components/layout/RoleRoute";
import { useAuthStore } from "./stores/authStore";

function SettingsRedirect() {
  const { user } = useAuthStore();

  if (user?.role === "WOREDA_ADMIN") {
    return <Navigate to="/woreda/settings" replace />;
  }

  if (user?.role === "HIBRET_ADMIN") {
    return <Navigate to="/hibret/settings" replace />;
  }

  if (user?.role === "MEMBER") {
    return <Navigate to="/member/settings" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const { loadCurrentUser } = useAuthStore();

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  return (
    <Routes>
      <Route path="/setup-account" element={<SetupPasswordPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/settings" element={<SettingsRedirect />} />

        <Route element={<RoleRoute allowedRoles={["HIBRET_ADMIN"]} />}>
          <Route element={<HibretLayout />}>
            <Route path="/hibret" element={<Navigate to="/hibret/dashboard" replace />} />
            <Route path="/hibret/dashboard" element={<HibretDashboardPage />} />
            <Route path="/hibret/announcements" element={<HibretAnnouncementsPage />} />
            <Route
              path="/hibret/announcements/:announcementId"
              element={<HibretAnnouncementDetailPage />}
            />
            <Route path="/hibret/reports" element={<HibretReportsPage />} />
            <Route path="/hibret/reports/:reportId" element={<HibretReportDetailPage />} />
            <Route path="/hibret/broadcasts" element={<HibretBroadcastsPage />} />
            <Route path="/hibret/broadcasts/:broadcastId" element={<HibretBroadcastDetailPage />} />
            <Route path="/hibret/chat" element={<HibretChatPage />} />
            <Route path="/hibret/resources" element={<HibretResourcesPage />} />
            <Route path="/hibret/members" element={<HibretMembersPage />} />
            <Route path="/hibret/members/:memberId" element={<HibretMemberDetailPage />} />
            <Route path="/hibret/users" element={<UsersPage />} />
            <Route path="/hibret/settings" element={<HibretSettingsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["MEMBER"]} />}>
          <Route element={<MemberLayout />}>
            <Route path="/member" element={<Navigate to="/member/dashboard" replace />} />
            <Route path="/member/dashboard" element={<MemberDashboardPage />} />
            <Route path="/member/broadcasts" element={<MemberBroadcastsPage />} />
            <Route path="/member/broadcasts/:broadcastId" element={<MemberBroadcastDetailPage />} />
            <Route path="/member/forms" element={<MemberFormsPage />} />
            <Route path="/member/forms/:formId" element={<MemberFormDetailPage />} />
            <Route path="/member/resources" element={<MemberResourcesPage />} />
            <Route path="/member/chat" element={<MemberChatPage />} />
            <Route path="/member/profile" element={<MemberProfilePage />} />
            <Route path="/member/settings" element={<MemberSettingsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["WOREDA_ADMIN"]} />}>
          <Route element={<WoredaLayout />}>
            <Route path="/woreda" element={<Navigate to="/woreda/dashboard" replace />} />
            <Route path="/woreda/dashboard" element={<WoredaDashboardPage />} />

            <Route path="/woreda/announcements" element={<AnnouncementsPage />} />
            <Route
              path="/woreda/announcements/:announcementId/hibrets/:hibretId/report"
              element={<WoredaReportReviewPage />}
            />
            <Route path="/woreda/announcements/:announcementId" element={<AnnouncementDetailPage />} />

            <Route path="/woreda/hibrets" element={<HibretsPage />} />
            <Route path="/woreda/hibrets/:hibretId" element={<HibretDetailPage />} />
            <Route path="/woreda/hibrets/:hibretId/political" element={<HibretPoliticalPage />} />
            <Route path="/woreda/hibrets/:hibretId/administrative" element={<HibretAdministrativePage />} />

            <Route path="/woreda/users" element={<UsersPage />} />
            <Route path="/woreda/members" element={<MembersPage />} />
            <Route path="/woreda/members/:memberId" element={<MemberDetailPage />} />

            <Route path="/woreda/admins" element={<AdminsPage />} />
            <Route path="/woreda/admins/:adminId" element={<AdminDetailPage />} />

            <Route path="/woreda/resources" element={<ResourcesPage />} />
            <Route path="/woreda/gallery" element={<GalleryPage />} />

            <Route path="/woreda/broadcasts" element={<BroadcastsPage />} />
            <Route path="/woreda/broadcasts/new" element={<BroadcastEditorPage />} />
            <Route path="/woreda/broadcasts/:broadcastId/edit" element={<BroadcastEditorPage />} />
            <Route path="/woreda/broadcasts/:broadcastId" element={<BroadcastDetailPage />} />

            <Route path="/woreda/chat" element={<ChatPage />} />
            <Route path="/woreda/activity" element={<ActivityPage />} />
            <Route path="/woreda/activity/admin" element={<AdminActivityDetailPage />} />
            <Route path="/woreda/settings" element={<WoredaSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
