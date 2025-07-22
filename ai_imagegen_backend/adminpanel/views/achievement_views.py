from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from django.shortcuts import get_object_or_404

from users.models import Achievement, UserAchievement, User
from users.serializers import AchievementSerializer

class AdminAchievementListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        achievements = Achievement.objects.all()
        serializer = AchievementSerializer(achievements, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request):
        serializer = AchievementSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAchievementDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        achievement = get_object_or_404(Achievement, pk=pk)
        serializer = AchievementSerializer(achievement, context={"request": request})
        return Response(serializer.data)

    def put(self, request, pk):
        achievement = get_object_or_404(Achievement, pk=pk)
        serializer = AchievementSerializer(achievement, data=request.data, partial=True, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        achievement = get_object_or_404(Achievement, pk=pk)
        achievement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAwardAchievementView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, achievement_id, user_id):
        user = get_object_or_404(User, pk=user_id)
        achievement = get_object_or_404(Achievement, pk=achievement_id)

        UserAchievement.objects.get_or_create(user=user, achievement=achievement)
        return Response({"message": f"Achievement '{achievement.name}' awarded to {user.username}"})

class AdminUserSearchView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        query = request.GET.get("q", "")
        users = User.objects.filter(username__icontains=query).values("id", "username")[:10]
        return Response(list(users))