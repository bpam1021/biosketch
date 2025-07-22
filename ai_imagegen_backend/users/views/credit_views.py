from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from users.models import CreditTransaction
from decimal import Decimal

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_remaining_credits(request):
    credits = request.user.profile.credits
    return Response({'credits': credits})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def credit_transaction_history(request):
    transactions = CreditTransaction.objects.filter(user=request.user).order_by('-timestamp')
    data = [
        {
            "id": tx.id,
            "type": tx.type,
            "amount": tx.amount,
            "description": tx.description,
            "timestamp": tx.timestamp,
        }
        for tx in transactions
    ]
    return Response(data)


def deduct_credit_for_image_generation(user, num_images: int, quality: str):
    profile = user.profile

    quality_cost_map = {
        'low': 0.1,
        'medium': 0.25,
        'high': 1.0,
    }

    cost_per_image = Decimal(str(quality_cost_map.get(quality.lower())))
    total_cost = Decimal(num_images) * cost_per_image

    if profile.credits < total_cost:
        raise ValueError("Not enough credits.")

    profile.credits -= total_cost
    profile.save()

    CreditTransaction.objects.create(
        user=user,
        amount=-total_cost,
        type='usage',
        description=f'Used {total_cost:.2f} credits for generating {num_images} {quality} image(s)'
    )

def deduct_credit_for_presentation(user, quality: str):
    profile = user.profile

    presentation_cost_map = {
        'low': 0.5,
        'medium': 1.5,
        'high': 5.0,
    }

    cost = presentation_cost_map.get(quality.lower())
    if cost is None:
        raise ValueError("Invalid quality value")
    cost = Decimal(str(cost))
    if profile.credits < cost:
        raise ValueError("Not enough credits.")

    profile.credits -= cost
    profile.save()

    CreditTransaction.objects.create(
        user=user,
        amount=-cost,
        type='usage',
        description=f'Used {cost:.2f} credits for {quality} quality presentation generation'
    )
