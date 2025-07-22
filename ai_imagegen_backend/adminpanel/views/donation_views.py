from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from users.models import Donation
from django.db.models import Sum, Count
from datetime import timedelta
from django.utils.timezone import now

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_donations_summary(request):
    donations = Donation.objects.all().order_by('-created_at')

    # Aggregate stats
    total = donations.aggregate(total=Sum('amount'))['total'] or 0
    count = donations.count()

    last_7_days = now() - timedelta(days=7)
    weekly_total = donations.filter(created_at__gte=last_7_days).aggregate(Sum('amount'))['amount__sum'] or 0

    return Response({
        'total_donations': total,
        'weekly_total': weekly_total,
        'count': count,
        'recent': [
            {
                'id': d.id,
                'name': d.name,
                'email': d.email,
                'amount': float(d.amount),
                'date': d.created_at,
            } for d in donations[:20]
        ]
    })
