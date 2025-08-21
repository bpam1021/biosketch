# ai_imagegen_backend/users/urls.py
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

# Keep all your existing imports
from users.views.auth_views import LoginView, RegisterView, check_username, check_email
from users.views.profile_views import (
    UserProfileView, EditUserProfileView,
    ChangePasswordView, NotificationSettingsView, DeleteAccountView, 
    PublicUserProfileView, UserGeneratedImagesView, LeaderboardView, FeedbackView
)
from users.views.payment_views import (
    create_payment_intent, confirm_payment, stripe_webhook
)
from users.views.credit_views import get_remaining_credits, credit_transaction_history, deduct_credit_for_image_generation
from users.views.image_views import generate_image, generate_description, save_description, remove_background, remove_text, get_images
from users.views.friend_views import send_invitation, my_invited_users, process_credit_rewards
from users.views.follow_views import FollowUserView, UnfollowUserView
from users.views.sam_views import magic_select
from users.views.ai_views import edit_image_openai
from users.views.donation_views import create_donation_session, donation_webhook
from users.views.template_views import TemplateRequestCreateView, PublicTemplateCategoryView, TemplateRequestStatusView

# NEW ENHANCED PRESENTATION IMPORTS
from users.views.presentation_views import (
    PresentationViewSet, ContentSectionViewSet, DiagramElementViewSet,
    ChartTemplateViewSet, PresentationTemplateViewSet, PresentationCommentViewSet,
    AIGenerationView, PresentationAnalyticsView
)

def catch_all(request, *args, **kwargs):
    return JsonResponse({"error": "Matched catch-all", "path": request.path}, status=404)

# Setup routers for new presentation system
router = DefaultRouter()
router.register(r'presentations', PresentationViewSet, basename='presentation')
router.register(r'presentation-templates', PresentationTemplateViewSet)
router.register(r'chart-templates', ChartTemplateViewSet)

# Nested routers for presentations
presentations_router = routers.NestedDefaultRouter(router, r'presentations', lookup='presentation')
presentations_router.register(r'sections', ContentSectionViewSet, basename='presentation-sections')
presentations_router.register(r'comments', PresentationCommentViewSet, basename='presentation-comments')

# Nested router for sections
sections_router = routers.NestedDefaultRouter(presentations_router, r'sections', lookup='section')
sections_router.register(r'diagrams', DiagramElementViewSet, basename='section-diagrams')

urlpatterns = [
    # ============================================================================
    # EXISTING ROUTES - UNCHANGED
    # ============================================================================
    
    # 🔐 Auth
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/check-username/', check_username, name='check-username'),
    path('auth/check-email/', check_email, name='check-email'),

    # 👤 Profile
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('profile/edit/', EditUserProfileView.as_view(), name='edit-profile'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('profile/notifications/', NotificationSettingsView.as_view(), name='notification-settings'),
    path('profile/delete/', DeleteAccountView.as_view(), name='delete-account'),
    path('profile/<str:username>/', PublicUserProfileView.as_view(), name='public-profile'),
    path('profile/<str:username>/images/', UserGeneratedImagesView.as_view(), name='user-images'),

    path('feedback/', FeedbackView.as_view(), name='feedback'),

    # 💳 Payments
    path('payments/create-intent/', create_payment_intent, name='create-payment-intent'),
    path('payments/confirm/', confirm_payment, name='confirm-payment'),
    path('payments/webhook/', stripe_webhook, name='stripe-webhook'),

    # 🪙 Credits
    path('credits/remaining/', get_remaining_credits, name='remaining-credits'),
    path('credits/transactions/', credit_transaction_history, name='credit-transaction-history'),
    path('credits/deduct/', deduct_credit_for_image_generation, name='deduct-credits'),

    # 🖼️ Image Generation & Tools
    path('images/generate/', generate_image, name='generate-image'),
    path('images/generate-description/', generate_description, name='generate-description'),
    path('images/save-description/', save_description, name='save-description'),
    path('images/remove-background/', remove_background, name='remove-background'),
    path('images/remove-text/', remove_text, name='remove-text'),
    path('images/templates/', get_images, name='template-images'),

    # 👫 Friend System
    path('friends/invite/', send_invitation, name='send-invite'),
    path('friends/invited-users/', my_invited_users, name='my-invited-users'),
    path('friends/process-credit-rewards/', process_credit_rewards, name='process-credit-rewards'),

    # 📊 Leaderboard
    path('leaderboard/', LeaderboardView.as_view(), name='user-leaderboard'),

    path("follow/<str:username>/", FollowUserView.as_view()),
    path("unfollow/<str:username>/", UnfollowUserView.as_view()),

    path('magic-segment/', magic_select, name='magic-select'),
    path('ai/image-edit/', edit_image_openai, name='image-edit'),

    path('create-donation-session/', create_donation_session, name='create-donation-session'),
    path('donation-webhook/', donation_webhook, name='donation-webhook'),

    # 🎨 Templates (existing)
    path('templates/categories/', PublicTemplateCategoryView.as_view(), name='public-template-categories'),
    path('templates/request/', TemplateRequestCreateView.as_view(), name='template-request-create'),
    path('templates/request/status/', TemplateRequestStatusView.as_view(), name='template-request-status'),

    # ============================================================================
    # NEW ENHANCED PRESENTATION ROUTES - SIMPLIFIED URLS
    # ============================================================================
    
    # Include all router URLs with simplified paths
    path('', include(router.urls)),
    path('', include(presentations_router.urls)),
    path('', include(sections_router.urls)),
    
    # AI Generation endpoints
    path('ai/generate/', AIGenerationView.as_view(), name='ai-generate'),
    path('ai/suggest-charts/', 
         ChartTemplateViewSet.as_view({'post': 'suggest_for_content'}), name='ai-suggest-charts'),
    
    # Analytics
    path('presentations/<uuid:presentation_id>/analytics/', 
         PresentationAnalyticsView.as_view(), name='presentation-analytics'),
    
    # Content enhancement endpoints
    path('sections/<uuid:section_id>/enhance/', 
         ContentSectionViewSet.as_view({'post': 'enhance_content'}), name='enhance-content'),
    path('sections/<uuid:section_id>/generate-content/', 
         ContentSectionViewSet.as_view({'post': 'generate_content'}), name='generate-section-content'),
    
    # Bulk operations
    path('presentations/<uuid:presentation_id>/bulk-update-sections/', 
         ContentSectionViewSet.as_view({'post': 'bulk_update'}), name='bulk-update-sections'),
    path('presentations/<uuid:presentation_id>/reorder-sections/', 
         ContentSectionViewSet.as_view({'post': 'reorder'}), name='reorder-sections'),
    
    # Export endpoints
    path('presentations/<uuid:pk>/export/', 
         PresentationViewSet.as_view({'post': 'export'}), name='export-presentation'),
    path('presentations/<uuid:pk>/export-status/', 
         PresentationViewSet.as_view({'get': 'export_status'}), name='export-status'),
    
    # Template operations
    path('presentations/<uuid:pk>/apply-template/', 
         PresentationViewSet.as_view({'post': 'apply_template'}), name='apply-template'),
    path('presentations/<uuid:pk>/duplicate/', 
         PresentationViewSet.as_view({'post': 'duplicate'}), name='duplicate-presentation'),
    
    # Chart and diagram operations
    path('diagrams/<uuid:pk>/regenerate/', 
         DiagramElementViewSet.as_view({'post': 'regenerate'}), name='regenerate-diagram'),
    
    # Search and filtering
    path('presentations/search/', 
         PresentationViewSet.as_view({'get': 'list'}), name='search-presentations'),
]