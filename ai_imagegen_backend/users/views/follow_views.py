# users/views/follow_views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework import status

class FollowUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        target = get_object_or_404(User, username=username)
        if target == request.user:
            return Response({"error": "You cannot follow yourself."}, status=400)
        target.profile.followers.add(request.user)
        return Response({"message": "Followed"})

class UnfollowUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        target = get_object_or_404(User, username=username)
        target.profile.followers.remove(request.user)
        return Response({"message": "Unfollowed"})
