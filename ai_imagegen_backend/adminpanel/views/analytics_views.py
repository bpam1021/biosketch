from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils.timezone import now, timedelta
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from community.models import CommunityPost, CommunityGroup, Challenge, ChallengeEntry, CommunityComment
from users.models import GeneratedImage, CreditTransaction, UserProfile
from django.db.models import Count, Q

TRUNC_MAP = {
    "day": TruncDay,
    "week": TruncWeek,
    "month": TruncMonth,
    "year": TruncYear,
}

DEFAULT_DAYS_LOOKBACK = {
    "day": 7,
    "week": 90,
    "month": 365,
    "year": 1825,  # ~5 years
}

def get_trunc_function(granularity):
    return TRUNC_MAP.get(granularity, TruncMonth)

def get_time_limit(granularity):
    return now() - timedelta(days=DEFAULT_DAYS_LOOKBACK.get(granularity, 365))

class AdminUserGrowthAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        granularity = request.GET.get("granularity", "month")
        trunc_func = get_trunc_function(granularity)
        time_limit = get_time_limit(granularity)

        users = (
            User.objects.filter(date_joined__gte=time_limit)
            .annotate(period=trunc_func("date_joined"))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        return Response(users)

class AdminImageGenerationTrendAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        granularity = request.GET.get("granularity", "month")
        trunc_func = get_trunc_function(granularity)
        time_limit = get_time_limit(granularity)

        images = (
            GeneratedImage.objects.filter(created_at__gte=time_limit)
            .annotate(period=trunc_func("created_at"))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )
        return Response(images)

class AdminCreditUserTrendAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        granularity = request.GET.get("granularity", "month")
        trunc_func = get_trunc_function(granularity)
        time_limit = get_time_limit(granularity)

        credit_users = (
            CreditTransaction.objects
            .filter(timestamp__gte=time_limit)
            .annotate(period=trunc_func("timestamp"))
            .values("period")
            .annotate(credit_user_count=Count("user", distinct=True))
            .order_by("period")
        )

        return Response(credit_users)

class AdminCreditUserSummaryAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        all_users = User.objects.count()
        credit_users = CreditTransaction.objects.values("user").distinct().count()
        free_users = all_users - credit_users

        return Response({
            "free_users": free_users,
            "credit_users": credit_users,
        })

class AdminPlatformOverview(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Basic counts
        total_users = User.objects.count()
        total_images = GeneratedImage.objects.count()
        total_posts = CommunityPost.objects.count()
        total_groups = CommunityGroup.objects.count()
        total_comments = CommunityComment.objects.count()
        # Growth in last 7 days
        last_week = now() - timedelta(days=7)
        new_users_week = User.objects.filter(date_joined__gte=last_week).count()
        new_images_week = GeneratedImage.objects.filter(created_at__gte=last_week).count()

        # Active users (defined as users who posted, generated images, or commented)
        active_user_ids = set(CommunityPost.objects.filter(created_at__gte=last_week).values_list("user", flat=True)) | \
                          set(GeneratedImage.objects.filter(created_at__gte=last_week).values_list("user", flat=True))
        active_users_week = len(active_user_ids)

        return Response({
            "total_users": total_users,
            "new_users_this_week": new_users_week,
            "active_users_this_week": active_users_week,
            "total_generated_images": total_images,
            "new_images_this_week": new_images_week,
            "total_community_posts": total_posts,
            "total_community_groups": total_groups,
            "total_community_comments": total_comments,
        })


class AdminLeaderboardStats(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Annotate total images generated, total published, likes, and challenges won
        top_creators = (
            UserProfile.objects.select_related("user")
            .annotate(
                total_images_generated=Count("user__generatedimage", distinct=True),
                total_images_published=Count(
                    "user__generatedimage",
                    filter=Q(user__generatedimage__is_published=True),
                    distinct=True
                ),
                total_likes_received=Count("user__generatedimage__upvotes", distinct=True)
            )
            .order_by("-total_images_generated")[:5]
            .values(
                "user__username",
                "total_images_generated",
                "total_images_published",
                "total_likes_received",
                "challenges_won"
            )
        )

        return Response({
            "top_creators": list(top_creators),
        })


class AdminChallengeAnalytics(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_challenges = Challenge.objects.count()
        total_entries = ChallengeEntry.objects.count()

        active_challenges = Challenge.objects.filter(is_active=True).count()
        completed_challenges = total_challenges - active_challenges

        return Response({
            "total_challenges": total_challenges,
            "active_challenges": active_challenges,
            "completed_challenges": completed_challenges,
            "total_entries": total_entries,
        })


class AdminCreditTransactionStats(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        last_30_days = now() - timedelta(days=30)
        recent_transactions = CreditTransaction.objects.filter(timestamp__gte=last_30_days)

        total_recharged = recent_transactions.filter(amount__gt=0).aggregate(total=models.Sum("amount"))["total"] or 0
        total_used = recent_transactions.filter(amount__lt=0).aggregate(total=models.Sum("amount"))["total"] or 0

        return Response({
            "total_recharged_last_30_days": total_recharged,
            "total_used_last_30_days": abs(total_used),
            "transaction_count": recent_transactions.count(),
        })
