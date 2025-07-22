import stripe
import logging
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from users.models import UserSubscription, CreditTransaction
from users.views.friend_views import process_credit_rewards
from users.utils.packages import CREDIT_PACKAGES

# Configure Stripe
stripe.api_key = settings.STRIPE_TEST_SECRET_KEY

logger = logging.getLogger(__name__)

# 💳 Create Payment Intent (authenticated user)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    user = request.user
    package_key = request.data.get("package_key")

    from users.utils.packages import CREDIT_PACKAGES
    if package_key not in CREDIT_PACKAGES:
        return Response({"error": "Invalid package selected"}, status=400)

    package = CREDIT_PACKAGES[package_key]

    try:
        intent = stripe.PaymentIntent.create(
            amount=package["price"],
            currency="usd",
            automatic_payment_methods={'enabled': True},
            metadata={
                'user_id': user.id,
                'package_key': package_key,
            }
        )
        return Response({
            'client_secret': intent['client_secret'],
            'package': package
        })
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {e}")
        return Response({'error': str(e)}, status=400)



# ✅ Confirm Payment Intent Status (optional)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    payment_intent_id = request.data.get('payment_intent_id')

    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent['status'] == 'succeeded':
            return Response({"success": True, "message": "Payment successful!"})

        return Response({"success": False, "message": "Payment not completed."})

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving intent: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ⚙️ Stripe Webhook (handles actual credit top-up)
@api_view(['POST'])
@permission_classes([AllowAny])  # Stripe cannot authenticate
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError:
        logger.warning("Invalid payload in webhook.")
        return Response(status=400)
    except stripe.error.SignatureVerificationError:
        logger.warning("Webhook signature verification failed.")
        return Response(status=400)

    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        user_id = payment_intent['metadata'].get('user_id')
        package_key = payment_intent['metadata'].get('package_key')

        try:
            user = User.objects.get(id=user_id)
            profile = user.profile
            package = CREDIT_PACKAGES[package_key]

            profile.credits += package['credits']
            profile.save()

            CreditTransaction.objects.create(
                user=user,
                amount=package['credits'],
                type='recharge',
                description=f"{package['name']} purchased"
            )

            UserSubscription.objects.create(
                user=user,
                plan_name=package['name'],
                amount=package['price'],
                base_price=package['base_price'],
                credits_added=package['credits'],
                stripe_payment_intent_id=payment_intent['id']
            )

            process_credit_rewards(invitee=user, credits_purchased=package['credits'])

        except Exception as e:
            logger.exception(f"Webhook processing failed: {e}")
            return Response({"error": "Webhook processing error"}, status=500)

    return Response(status=200)
