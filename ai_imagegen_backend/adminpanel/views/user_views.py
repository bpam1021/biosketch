from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from users.models import UserProfile, CreditTransaction, GeneratedImage
from community.models import CommunityPost, CommunityComment, ChallengeEntry
from adminpanel.permissions import IsAdminUser
from users.serializers import UserSerializer
from rest_framework import status
from django.db.models import Count, Q

class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        users = User.objects.all().select_related('profile')
        data = []

        for user in users:
            profile = getattr(user, 'profile', None)

            total_generated = GeneratedImage.objects.filter(user=user).count()
            total_published = GeneratedImage.objects.filter(user=user, is_published=True).count()
            total_challenges = ChallengeEntry.objects.filter(user=user).count()
            total_likes = GeneratedImage.objects.filter(user=user).aggregate(
                likes=Count('upvotes', distinct=True)
            )['likes'] or 0

            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'date_joined': user.date_joined,
                'profile': {
                    'bio': profile.bio if profile else '',
                    'credits': profile.credits if profile else 0,
                    'profile_visibility': profile.profile_visibility if profile else 'unknown',
                    'total_images_generated': total_generated,
                    'total_images_published': total_published,
                    'total_challenge_entries': total_challenges,
                    'total_likes_received': total_likes,
                }
            })

        return Response(data)

class AdminUserActivityView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'User not found'}, status=404)

        posts = CommunityPost.objects.filter(user=user).count()
        comments = CommunityComment.objects.filter(user=user).count()
        credits = CreditTransaction.objects.filter(user=user).order_by('-timestamp')
        credit_data = [
            {'amount': c.amount, 'type': c.type, 'timestamp': c.timestamp, 'description': c.description}
            for c in credits
        ]

        return Response({
            'user_id': user.id,
            'username': user.username,
            'post_count': posts,
            'comment_count': comments,
            'credit_history': credit_data,
        })

class AdminUserSuspendView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'User not found'}, status=404)
        user.is_active = False
        user.save()
        return Response({'message': 'User account suspended.'})

class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'User not found'}, status=404)
        user.delete()
        return Response({'message': 'User account deleted.'})

class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, user_id):
        try:
            user = User.objects.select_related('profile').get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(user, 'profile', None)

        total_generated = GeneratedImage.objects.filter(user=user).count()
        total_published = GeneratedImage.objects.filter(user=user, is_published=True).count()
        total_challenges = ChallengeEntry.objects.filter(user=user).count()
        total_likes = GeneratedImage.objects.filter(user=user).aggregate(
            likes=Count('upvotes', distinct=True)
        )['likes'] or 0

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'date_joined': user.date_joined,
            'last_login': user.last_login,
            'profile': {
                'bio': profile.bio if profile else '',
                'phone_number': profile.phone_number if profile else '',
                'profile_picture': profile.profile_picture.url if profile and profile.profile_picture else '',
                'credits': profile.credits if profile else 0,
                'profile_visibility': profile.profile_visibility if profile else 'unknown',
                'total_images_generated': total_generated,
                'total_images_published': total_published,
                'total_challenge_entries': total_challenges,
                'total_likes_received': total_likes,
                'challenges_won': profile.challenges_won if profile else 0,
            }
        })
