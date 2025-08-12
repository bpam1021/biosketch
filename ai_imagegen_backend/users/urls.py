from django.urls import path
from django.http import JsonResponse

from users.views.auth_views import LoginView, RegisterView, check_username, check_email
from users.views.profile_views import (
    UserProfileView, EditUserProfileView,
    ChangePasswordView, NotificationSettingsView, DeleteAccountView, PublicUserProfileView, UserGeneratedImagesView, LeaderboardView, FeedbackView
)
from users.views.payment_views import (
    create_payment_intent, confirm_payment, stripe_webhook
)

from users.views.presentation_views import (
    CreatePresentationView,
    PresentationDetailView,
    ReorderSlidesView,
    SlideUpdateView,
    SlideDeleteView,
    SlideRegenerateView,
    SlideDuplicateView,
    UpdateCanvasJSONView,
    ListPresentationsView,
)

from users.views.export_views import ExportPresentationView, ExportPresentationVideoView, export_status_view, force_download_view
from users.views.credit_views import get_remaining_credits, credit_transaction_history, deduct_credit_for_image_generation
from users.views.image_views import generate_image, generate_description, save_description, remove_background, remove_text, get_images
from users.views.friend_views import send_invitation, my_invited_users, process_credit_rewards
from users.views.follow_views import FollowUserView, UnfollowUserView
from users.views.sam_views import magic_select
from users.views.ai_views import edit_image_openai
from users.views.donation_views import create_donation_session, donation_webhook

from users.views.template_views import TemplateRequestCreateView, PublicTemplateCategoryView, TemplateRequestStatusView

def catch_all(request, *args, **kwargs):
    return JsonResponse({"error": "Matched catch-all", "path": request.path}, status=404)

urlpatterns = [
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

    
    path('presentations/', CreatePresentationView.as_view(), name='create-presentation'),
    path('presentations/<int:pk>/', PresentationDetailView.as_view(), name='get-presentation'),
    path('presentations/<int:pk>/reorder/', ReorderSlidesView.as_view(), name='reorder-slides'),
    path('slides/<int:pk>/', SlideUpdateView.as_view(), name='update-slide'),
    path('slides/<int:pk>/delete/', SlideDeleteView.as_view(), name='delete-slide'),
    path('slides/<int:pk>/regenerate/', SlideRegenerateView.as_view(), name='regenerate-slide'),
    path('slides/<int:pk>/duplicate/', SlideDuplicateView.as_view(), name='duplicate-slide'),
    path('slides/<int:pk>/canvas/', UpdateCanvasJSONView.as_view(), name='update-canvas-json'),
    path('presentations/list/', ListPresentationsView.as_view(), name='list-presentations'),
    
    path('presentations/<int:pk>/export/force-download/', force_download_view),
    path('presentations/<int:pk>/export/status/', export_status_view, name='export-status'),
    path('presentations/<int:pk>/export/mp4/', ExportPresentationVideoView.as_view(), name='export-presentation-video'),
    path('presentations/<int:pk>/export/<str:export_format>/', ExportPresentationView.as_view(), name='export-presentation'),

    path('magic-segment/', magic_select, name='magic-select'),
    path('ai/image-edit/', edit_image_openai, name='image-edit'),
    path('templates/categories/', PublicTemplateCategoryView.as_view(), name='public-template-categories'),
    path('templates/request/', TemplateRequestCreateView.as_view(), name='template-request-create'),
    path('templates/request/status/', TemplateRequestStatusView.as_view(), name='template-request-status'),

    path('create-donation-session/', create_donation_session, name='create-donation-session'),
    path('donation-webhook/', donation_webhook, name='donation-webhook'),
]
