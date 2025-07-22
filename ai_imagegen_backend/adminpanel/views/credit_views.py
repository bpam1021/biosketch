from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from users.models import UserProfile, CreditTransaction
from users.serializers import CreditTransactionSerializer

class AdminCreditSummaryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        profiles = UserProfile.objects.select_related("user")
        data = []

        for profile in profiles:
            user = profile.user

            total_recharge = (
                CreditTransaction.objects
                .filter(user=user, type='recharge')
                .aggregate(total=Sum('amount'))['total'] or 0
            )

            total_usage = (
                CreditTransaction.objects
                .filter(user=user, type='usage')
                .aggregate(total=Sum('amount'))['total'] or 0
            )

            data.append({
                "user_id": user.id,
                "username": user.username,
                "total_recharge": total_recharge,
                "total_usage": abs(total_usage),  # usage is negative, show as positive
                "credits": profile.credits,
            })

        return Response(data)

class AdminUserTransactionHistoryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        transactions = CreditTransaction.objects.filter(user__id=user_id).order_by("-timestamp")
        serializer = CreditTransactionSerializer(transactions, many=True)
        return Response(serializer.data)