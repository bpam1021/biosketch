from django.db.models import Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from users.serializers import UserProfileEditSerializer, NotificationSettingsSerializer, PublicUserProfileSerializer, LeaderboardUserSerializer, FeedbackSerializer
from users.models import NotificationSettings, GeneratedImage, UserProfile, Feedback
from community.serializers import GeneratedImageSerializer

class UserGeneratedImagesView(APIView):
    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        images = GeneratedImage.objects.filter(user=user).order_by('-created_at')[:12]
        serializer = GeneratedImageSerializer(images, many=True)
        return Response(serializer.data)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)  # 👈 fallback creation

        profile_picture_url = None
        if profile.profile_picture:
            try:
                profile_picture_url = request.build_absolute_uri(profile.profile_picture.url)
            except ValueError:
                profile_picture_url = profile.profile_picture.url

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'profile_picture': profile_picture_url,
            'bio': profile.bio,
            'profile_visibility': profile.profile_visibility,
            'phone_number': profile.phone_number,
        })

class FeedbackView(APIView):
    permission_classes = []  # AllowAny

    def post(self, request):
        serializer = FeedbackSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Feedback submitted successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PublicUserProfileView(APIView):
    permission_classes = []

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        profile = user.profile
        is_following = False
        if request.user.is_authenticated:
            is_following = profile.followers.filter(id=request.user.id).exists()
        serializer = PublicUserProfileSerializer(profile, context={'request': request})
        data = serializer.data
        data["is_following"] = is_following
        return Response(data)

    
class EditUserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileEditSerializer(request.user.profile, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = UserProfileEditSerializer(
            request.user.profile,
            data=request.data,
            partial=True,
            context={"request": request}  # ← This line is important
        )
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Profile updated successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not request.user.check_password(old_password):
            return Response({'error': 'Incorrect current password'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully'})


class NotificationSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        serializer = NotificationSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def post(self, request):
        settings_obj, _ = NotificationSettings.objects.get_or_create(user=request.user)
        serializer = NotificationSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Notification settings updated'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.delete()
        return Response({'message': 'Account deleted successfully'})
    
class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        users = (
            UserProfile.objects.select_related("user")
            .annotate(
                total_images_generated=Count("user__generatedimage", distinct=True),
                total_images_published=Count("user__generatedimage", filter=Q(user__generatedimage__is_published=True), distinct=True),
                total_upvotes=Count("user__generatedimage__upvotes", distinct=True),
                total_posts=Count("user__community_posts", distinct=True),
                total_challenges=Count("user__challenge_entries", distinct=True),
                followers_count=Count("followers", distinct=True),
            )
            .order_by("-total_upvotes")[:50]
        )
        serializer = LeaderboardUserSerializer(users, many=True, context={"request": request})
        return Response(serializer.data)
