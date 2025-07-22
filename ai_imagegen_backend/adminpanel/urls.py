from django.urls import path

from adminpanel.views.auth_views import AdminLoginView

from adminpanel.views.user_views import (
    AdminUserListView, AdminUserDetailView, AdminUserActivityView,
    AdminUserSuspendView, AdminUserDeleteView
)
from adminpanel.views.community_views import (
    AdminCommunityGroupListView, AdminCommunityGroupDetailView,
    AdminCommunityGroupApproveView, AdminCommunityGroupBanView,
    AdminCommunityGroupDeleteView, AdminCommunityGroupStatsView
)
from adminpanel.views.content_views import (
    AdminPostListView, AdminPostDeleteView, AdminCommentListView, AdminCommentDeleteView
)
from adminpanel.views.credit_views import (
    AdminCreditSummaryView, AdminUserTransactionHistoryView
)
from adminpanel.views.analytics_views import (
    AdminPlatformOverview, AdminLeaderboardStats,
    AdminChallengeAnalytics, AdminCreditTransactionStats, 
    AdminUserGrowthAPIView, AdminImageGenerationTrendAPIView, AdminCreditUserTrendAPIView, AdminCreditUserSummaryAPIView,
)
from adminpanel.views.setting_views import (
    AdminSystemSettingsView
)
from adminpanel.views.challenge_views import (
    AdminChallengeListCreateView, AdminChallengeDetailView
)
from adminpanel.views.achievement_views import (
    AdminAchievementListCreateView, AdminAchievementDetailView,
    AdminAwardAchievementView, AdminUserSearchView
)

from adminpanel.views.template_views import (
    AdminTemplateCategoryViewSet, AdminTemplateImageViewSet,
    AdminTemplateRequestListView
)

from adminpanel.views.donation_views import get_donations_summary

from adminpanel.views.feedback_views import FeedbackListView, FeedbackDetailView

urlpatterns = [

    path('login/', AdminLoginView.as_view()),
    # 👤 User Management
    path('users/', AdminUserListView.as_view()),
    path('users/<int:user_id>/', AdminUserDetailView.as_view()),
    path('users/<int:user_id>/activity/', AdminUserActivityView.as_view()),
    path('users/<int:user_id>/suspend/', AdminUserSuspendView.as_view()),
    path('users/<int:user_id>/delete/', AdminUserDeleteView.as_view()),

    # 👥 Community Groups
    path('community-groups/', AdminCommunityGroupListView.as_view()),
    path('community-groups/<int:pk>/', AdminCommunityGroupDetailView.as_view()),
    path('community-groups/<int:group_id>/approve/', AdminCommunityGroupApproveView.as_view()),
    path('community-groups/<int:group_id>/ban/', AdminCommunityGroupBanView.as_view()),
    path('community-groups/<int:group_id>/delete/', AdminCommunityGroupDeleteView.as_view()),
    path('community-groups/<int:group_id>/stats/', AdminCommunityGroupStatsView.as_view()),

    # 📝 Posts & Comments
    path('posts/', AdminPostListView.as_view()),
    path('posts/<int:post_id>/delete/', AdminPostDeleteView.as_view()),
    path('comments/', AdminCommentListView.as_view()),
    path('comments/<int:comment_id>/delete/', AdminCommentDeleteView.as_view()),

    # 💳 Credits & Transactions
    path('transactions/summary/', AdminCreditSummaryView.as_view()),
    path('users/<int:user_id>/transactions/', AdminUserTransactionHistoryView.as_view()),
    
    # 📊 Analytics
    path('analytics/overview/', AdminPlatformOverview.as_view()),
    path('analytics/leaderboard/', AdminLeaderboardStats.as_view()),
    path('analytics/challenges/', AdminChallengeAnalytics.as_view()),
    path('analytics/transactions/', AdminCreditTransactionStats.as_view()),
    path('analytics/user-growth/', AdminUserGrowthAPIView.as_view()),
    path('analytics/image-generation-trend/', AdminImageGenerationTrendAPIView.as_view()),
    path('analytics/credit-user-trend/', AdminCreditUserTrendAPIView.as_view()),
    path('analytics/credit-user-summary/', AdminCreditUserSummaryAPIView.as_view()),

    # ⚙️ System Settings
    path('settings/system/', AdminSystemSettingsView.as_view()),

    # 🏆 Challenge Management
    path('challenges/', AdminChallengeListCreateView.as_view()),
    path('challenges/<int:pk>/', AdminChallengeDetailView.as_view()),

    path('achievements/', AdminAchievementListCreateView.as_view()),
    path('achievements/<int:pk>/', AdminAchievementDetailView.as_view()),
    path('achievements/<int:achievement_id>/award/<int:user_id>/', AdminAwardAchievementView.as_view()),
    path('users/search/', AdminUserSearchView.as_view()),

    # 🖼️ Template Management
    path('templates/categories/', AdminTemplateCategoryViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('templates/categories/<int:pk>/', AdminTemplateCategoryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})),
    path('templates/images/', AdminTemplateImageViewSet.as_view({'get': 'list', 'post': 'create'})),
    path('templates/images/<int:pk>/', AdminTemplateImageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'})),
    path('templates/requests/', AdminTemplateRequestListView.as_view(), name='admin-template-requests'),

    path('donations/summary/', get_donations_summary, name='donations-summary'),

    path('feedback/', FeedbackListView.as_view(), name='admin-feedback-list'),
    path('feedback/<int:pk>/', FeedbackDetailView.as_view(), name='admin-feedback-detail'),
]
