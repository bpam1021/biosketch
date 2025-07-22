import { Route, Routes, Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

import DashboardHome from "../pages/DashboardHome";
import UserListPage from "../pages/Users/UserListPage";
import UserDetailPage from "../pages/Users/UserDetailPage";
import CommunityListPage from "../pages/Community/CommunityListPage";
import CommunityDetailPage from "../pages/Community/CommunityDetailPage";
import PostsPage from "../pages/Content/PostsPage";
import CommentsPage from "../pages/Content/CommentsPage";
import ChallengeListPage from "../pages/Challenges/ChallengeListPage";
import CreateChallengePage from "../pages/Challenges/CreateChallengePage";
import AchievementListPage from "../pages/Achievements/AchievementListPage";
import OverviewPage from "../pages/Analytics/OverviewPage";
import CreditTransactionPage from "../pages/Payments/CreditTransactionPage";
import SystemSettingsPage from "../pages/Settings/SystemSettingsPage";
import AdminTemplateManagerPage from "../pages/TemplateManage/TemplateManagerPage";
import AdminTemplateRequestPage from "../pages/TemplateManage/TemplateRequestPage";
import AdminFeedbackList from "../pages/Feedback/FeedbackPage";
import NotFound from "../pages/NotFound";

const AdminRoutes = () => {
  const { isAdminAuthenticated } = useAdminAuth();

  if (!isAdminAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/users" element={<UserListPage />} />
      <Route path="/users/:userId" element={<UserDetailPage />} />
      <Route path="/communities" element={<CommunityListPage />} />
      <Route path="/communities/:groupId" element={<CommunityDetailPage />} />
      <Route path="/posts" element={<PostsPage />} />
      <Route path="/comments" element={<CommentsPage />} />
      <Route path="/challenges" element={<ChallengeListPage />} />
      <Route path="/challenges/create" element={<CreateChallengePage />} />
      <Route path="/achievements" element={<AchievementListPage />} />
      <Route path="/analytics" element={<OverviewPage />} />
      <Route path="/payments" element={<CreditTransactionPage />} />
      <Route path="/settings" element={<SystemSettingsPage />} />
      <Route path="/template-manager" element={<AdminTemplateManagerPage />} />
      <Route path="/template-requests" element={<AdminTemplateRequestPage />} />
      <Route path="/feedback" element={<AdminFeedbackList />} />
      {/* Catch-all route for 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AdminRoutes;
