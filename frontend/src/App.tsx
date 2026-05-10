import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./i18n";

import { LoginPage } from "./pages/auth/LoginPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SetupPasswordPage } from "./pages/auth/SetupPasswordPage";
import { UnauthorizedPage } from "./pages/auth/UnauthorizedPage";

import { SettingsPage } from "./pages/settings/SettingsPage";
import { UsersPage } from "./pages/shared/users/UsersPage";

import { WoredaLayout } from "./layouts/WoredaLayout";
import { HibretLayout } from "./layouts/HibretLayout";
import { MemberLayout } from "./layouts/MemberLayout";

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
import { ChatPage } from "./pages/woreda/chat/ChatPage";
import { ActivityPage } from "./pages/woreda/activity/ActivityPage";
import { WoredaDashboardPage } from "./pages/woreda/dashboard/WoredaDashboardPage";

import { HibretAnnouncementsPage } from "./pages/hibret/announcements/HibretAnnouncementsPage";
import { HibretAnnouncementDetailPage } from "./pages/hibret/announcements/HibretAnnouncementDetailPage";
import { HibretBroadcastsPage } from "./pages/hibret/broadcasts/HibretBroadcastsPage";
import { HibretChatPage } from "./pages/hibret/chat/HibretChatPage";
import { HibretResourcesPage } from "./pages/hibret/resources/HibretResourcesPage";
import { HibretMembersPage } from "./pages/hibret/members/HibretMembersPage";
import { HibretMemberDetailPage } from "./pages/hibret/members/HibretMemberDetailPage";

import { MemberBroadcastsPage } from "./pages/member/broadcasts/MemberBroadcastsPage";
import { MemberResourcesPage } from "./pages/member/resources/MemberResourcesPage";
import { MemberProfilePage } from "./pages/member/profile/MemberProfilePage";
import { MemberChatPage } from "./pages/member/chat/MemberChatPage";

import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleRoute } from "./routes/RoleRoute";
import { useAuthStore } from "./store/authStore";

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
            <Route path="/hibret" element={<Navigate to="/hibret/announcements" replace />} />
            <Route path="/hibret/announcements" element={<HibretAnnouncementsPage />} />
            <Route
              path="/hibret/announcements/:announcementId"
              element={<HibretAnnouncementDetailPage />}
            />
            <Route path="/hibret/broadcasts" element={<HibretBroadcastsPage />} />
            <Route path="/hibret/chat" element={<HibretChatPage />} />
            <Route path="/hibret/resources" element={<HibretResourcesPage />} />
            <Route path="/hibret/members" element={<HibretMembersPage />} />
            <Route path="/hibret/members/:memberId" element={<HibretMemberDetailPage />} />
            <Route path="/hibret/users" element={<UsersPage />} />
            <Route path="/hibret/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route element={<RoleRoute allowedRoles={["MEMBER"]} />}>
          <Route element={<MemberLayout />}>
            <Route path="/member" element={<Navigate to="/member/broadcasts" replace />} />
            <Route path="/member/broadcasts" element={<MemberBroadcastsPage />} />
            <Route path="/member/resources" element={<MemberResourcesPage />} />
            <Route path="/member/chat" element={<MemberChatPage />} />
            <Route path="/member/profile" element={<MemberProfilePage />} />
            <Route path="/member/settings" element={<SettingsPage />} />
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

            <Route path="/woreda/chat" element={<ChatPage />} />
            <Route path="/woreda/activity" element={<ActivityPage />} />
            <Route path="/woreda/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;