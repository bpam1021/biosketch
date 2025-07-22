import stripe
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from users.models import Donation, User

stripe.api_key = settings.STRIPE_TEST_SECRET_KEY

@api_view(['POST'])
def create_donation_session(request):
    data = request.data
    amount = int(float(data['amount']) * 100)
    user = request.user if request.user.is_authenticated else None

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            payment_method_types=['card'],
            metadata={
                'user_id': user.id if user else '',
                'name': data.get('name', ''),
                'email': data.get('email'),
            },
            receipt_email=data.get('email'),
        )
        return Response({'clientSecret': intent.client_secret})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

@csrf_exempt
def donation_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        metadata = intent.get('metadata', {})

        user_id = metadata.get('user_id')
        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        Donation.objects.create(
            user=user,
            name=metadata.get('name', ''),
            email=metadata.get('email'),
            amount=float(intent['amount_received']) / 100,
            stripe_payment_intent=intent['id'],
        )

    return HttpResponse(status=200)
