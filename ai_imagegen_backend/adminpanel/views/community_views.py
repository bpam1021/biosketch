from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from django.shortcuts import get_object_or_404
from community.models import CommunityGroup, CommunityPost
from community.serializers import CommunityGroupSerializer
from rest_framework.permissions import IsAdminUser

class AdminCommunityGroupListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CommunityGroupSerializer

    def get_queryset(self):
        return CommunityGroup.objects.annotate(
            member_count=Count("memberships"),
            post_count=Count("posts")
        ).order_by("-created_at")


class AdminCommunityGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CommunityGroupSerializer
    queryset = CommunityGroup.objects.all()


class AdminCommunityGroupApproveView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, group_id):
        group = get_object_or_404(CommunityGroup, pk=group_id)

        # Example logic — adjust based on your model fields
        if hasattr(group, 'is_approved'):
            group.is_approved = True
            group.save()
            return Response({"status": "approved"})
        else:
            return Response({"error": "'is_approved' field not found on CommunityGroup"}, status=status.HTTP_400_BAD_REQUEST)
        
class AdminCommunityGroupBanView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, group_id):
        group = get_object_or_404(CommunityGroup, pk=group_id)
        group.is_banned = True
        group.ban_reason = request.data.get("reason", "")
        group.save()
        return Response({"status": "banned", "reason": group.ban_reason})


class AdminCommunityGroupDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, group_id):
        group = get_object_or_404(CommunityGroup, pk=group_id)
        group.is_deleted = True
        group.save()
        return Response({"status": "deleted (soft)"})

class AdminCommunityGroupStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        data = (
            CommunityGroup.objects.annotate(
                member_count=Count("memberships"),
                post_count=Count("posts")
            )
            .values("id", "name", "privacy", "created_at", "member_count", "post_count")
            .order_by("-created_at")
        )
        return Response(data)
