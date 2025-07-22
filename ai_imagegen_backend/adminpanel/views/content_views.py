from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from django.shortcuts import get_object_or_404
from community.models import CommunityPost, CommunityComment, Challenge
from community.serializers import CommunityPostSerializer, CommunityCommentSerializer, ChallengeSerializer


class AdminPostListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        posts = CommunityPost.objects.all().order_by('-created_at')
        serializer = CommunityPostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)


class AdminPostDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, post_id):
        post = get_object_or_404(CommunityPost, id=post_id)
        post.delete()
        return Response({"detail": "Post deleted."}, status=status.HTTP_204_NO_CONTENT)


class AdminCommentListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        comments = CommunityComment.objects.all().order_by('-created_at')
        serializer = CommunityCommentSerializer(comments, many=True)
        return Response(serializer.data)


class AdminCommentDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, comment_id):
        comment = get_object_or_404(CommunityComment, id=comment_id)
        comment.delete()
        return Response({"detail": "Comment deleted."}, status=status.HTTP_204_NO_CONTENT)


