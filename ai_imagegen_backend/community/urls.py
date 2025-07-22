from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter

from community.views.chat_views import chat_history, upload_chat_media
from community.views.challenge_views import ChallengeViewSet, ChallengeEntryViewSet, ChallengeLeaderboardView
from community.views.image_views import (
    FieldListView, FilteredImageListView, GeneratedImageDetailView,
    PublicImageListView, PublishImageView, CommentListCreateView,
    UpvoteToggleView, RemixImageView
)
from community.views.community_views import (
    CommunityGroupListCreateView, CommunityGroupDetailView,
    CommunityPostListCreateView, CommunityPostDetailView,
    CommunityCommentListCreateView, CommunityMembershipJoinView,
    CommunityMembershipLeaveView, MyCommunitiesView, InviteToCommunityView, ToggleCommunityPostLikeView
)

# Primary router
router = DefaultRouter()
router.register(r'challenges', ChallengeViewSet, basename='challenge')

# Nested router for challenge entries
challenge_entries_router = NestedDefaultRouter(router, r'challenges', lookup='challenge')
challenge_entries_router.register(r'entries', ChallengeEntryViewSet, basename='challenge-entries')

urlpatterns = [
    # Routers
    path('', include(router.urls)),
    path('', include(challenge_entries_router.urls)),

    # Challenge leaderboard
    path('challenges/<int:challenge_id>/leaderboard/', ChallengeLeaderboardView.as_view(), name='challenge-leaderboard'),

    # Field + Image filtering
    path('fields/', FieldListView.as_view(), name='field-list'),
    path('images/filter/', FilteredImageListView.as_view(), name='filtered-images'),
    path('images/<uuid:image_id>/', GeneratedImageDetailView.as_view(), name='image-detail'),
    path('images/public/', PublicImageListView.as_view(), name='public-images'),
    path('images/publish/', PublishImageView.as_view(), name='publish-image'),
    path('images/<uuid:image_id>/comments/', CommentListCreateView.as_view(), name='image-comments'),
    path('images/<uuid:image_id>/upvote/', UpvoteToggleView.as_view(), name='upvote-image'),
    path('images/<uuid:image_id>/remix/', RemixImageView.as_view(), name='remix-image'),

    # Chat
    path('chat/<str:room_name>/', chat_history, name='chat-history'),
    path('chat/<str:room_name>/upload/', upload_chat_media, name='upload-chat-media'),

    # Community Groups
    path('communities/', CommunityGroupListCreateView.as_view(), name='community-list-create'),
    path('communities/<int:pk>/', CommunityGroupDetailView.as_view(), name='community-detail'),
    path('communities/<int:community_id>/join/', CommunityMembershipJoinView.as_view(), name='community-join'),
    path('communities/<int:community_id>/leave/', CommunityMembershipLeaveView.as_view(), name='community-leave'),
    path('communities/<int:community_id>/invite/', InviteToCommunityView.as_view(), name='invite-to-community'),
    path('communities/mine/', MyCommunitiesView.as_view(), name='my-communities'),
    path('community-posts/<int:post_id>/like/', ToggleCommunityPostLikeView.as_view(), name='community-post-like'),

    # Community Posts & Comments
    path('communities/<int:community_id>/posts/', CommunityPostListCreateView.as_view(), name='community-posts'),
    path('communities/posts/<int:pk>/', CommunityPostDetailView.as_view(), name='community-post-detail'),
    path('communities/posts/<int:post_id>/comments/', CommunityCommentListCreateView.as_view(), name='community-post-comments'),
]
