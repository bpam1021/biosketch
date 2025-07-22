from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from users.models import FriendInvitation, CreditTransaction, UserSubscription


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invitation(request):
    """
    Invite another existing user (by username). The reward is triggered when invitee purchases credits.
    """
    invitee_username = request.data.get('username')

    if invitee_username == request.user.username:
        return Response({"error": "You cannot invite yourself."}, status=400)

    try:
        invitee = User.objects.get(username=invitee_username)
    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)

    if FriendInvitation.objects.filter(inviter=request.user, invitee=invitee).exists():
        return Response({"error": "You have already invited this user."}, status=400)

    FriendInvitation.objects.create(inviter=request.user, invitee=invitee)
    return Response({"message": f"Invitation sent to {invitee_username}."}, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_invited_users(request):
    """
    Returns the list of users you have invited.
    """
    invitations = FriendInvitation.objects.filter(inviter=request.user).select_related("invitee")
    data = [
        {
            "invitee_id": invite.invitee.id,
            "invitee_username": invite.invitee.username,
            "invited_at": invite.invited_at,
            "reward_credited": invite.reward_credited,
        }
        for invite in invitations
    ]
    return Response(data)


def process_credit_rewards(invitee: User, credits_purchased: int):
    """
    Trigger reward to inviter after successful payment by invitee.
    Called from Stripe webhook after payment is confirmed.
    """
    try:
        invitation = FriendInvitation.objects.get(invitee=invitee, reward_credited=False)
    except FriendInvitation.DoesNotExist:
        return

    inviter = invitation.inviter
    reward_credits = credits_purchased // 20

    # Update inviter's credits
    profile = inviter.profile
    profile.credits += reward_credits
    profile.save()

    # Mark reward and log it
    invitation.reward_credited = True
    invitation.save()

    CreditTransaction.objects.create(
        user=inviter,
        amount=reward_credits,
        type='recharge',
        description=f"Referral reward: {invitee.username} purchased {credits_purchased} credits"
    )
