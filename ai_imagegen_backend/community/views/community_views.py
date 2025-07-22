from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied
from users.models import GeneratedImage
from community.models import ImageComment, Upvote, Remix, CommunityGroup, CommunityPost, CommunityComment, CommunityMembership
from community.serializers import (
    ImageCommentSerializer, GeneratedImageSerializer,
    CommunityGroupSerializer, CommunityPostSerializer, CommunityCommentSerializer
)

class CommunityPostPagination(PageNumberPagination):
    page_size = 10
    page_query_param = 'page'  # ← correct usage (default anyway)
    page_size_query_param = 'page_size'  # ← optional if you want frontend to control size
    max_page_size = 50


class CommunityGroupListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityGroupSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        base_qs = CommunityGroup.objects.all()

        if not user.is_authenticated:
            return base_qs.filter(privacy='public', is_approved=True, is_banned=False, is_deleted=False)

        return base_qs.filter(
            Q(privacy='public') | Q(creator=user) | Q(memberships__user=user),
            # is_approved=True, is_banned=False, is_deleted=False
        ).distinct()

    def perform_create(self, serializer):
        community = serializer.save(creator=self.request.user, is_approved=True)
        CommunityMembership.objects.get_or_create(user=self.request.user, community=community)

class CommunityGroupDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CommunityGroup.objects.all()
    serializer_class = CommunityGroupSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class CommunityPostListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = CommunityPostPagination

    def get_queryset(self):
        community_id = self.kwargs['community_id']
        community = get_object_or_404(CommunityGroup, id=community_id)

        user = self.request.user
        if community.privacy == 'private' and (
            not user.is_authenticated or (
                community.creator != user and
                not CommunityMembership.objects.filter(user=user, community=community).exists()
            )
        ):
            return CommunityPost.objects.none()

        return CommunityPost.objects.filter(community=community).order_by('-created_at', '-id')

    def perform_create(self, serializer):
        community = get_object_or_404(CommunityGroup, id=self.kwargs['community_id'])
        user = self.request.user

        is_creator = (community.creator == user)
        is_member = CommunityMembership.objects.filter(user=user, community=community).exists()

        if community.privacy == 'private' and not (is_creator or is_member):
            raise PermissionDenied("You are not a member of this private community.")

        serializer.save(user=user, community=community)

class CommunityPostDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CommunityPost.objects.all()
    serializer_class = CommunityPostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class CommunityCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        post_id = self.kwargs['post_id']
        return CommunityComment.objects.filter(post_id=post_id)

    def perform_create(self, serializer):
        post = get_object_or_404(CommunityPost, id=self.kwargs['post_id'])
        serializer.save(user=self.request.user, post=post)

class CommunityMembershipJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id):
        community = CommunityGroup.objects.get(id=community_id)
        membership, created = CommunityMembership.objects.get_or_create(
            user=request.user,
            community=community
        )
        if created:
            return Response({'status': 'joined'}, status=status.HTTP_201_CREATED)
        else:
            return Response({'status': 'already a member'}, status=status.HTTP_200_OK)

class CommunityMembershipLeaveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id):
        community = get_object_or_404(CommunityGroup, id=community_id)
        membership = CommunityMembership.objects.filter(user=request.user, community=community).first()
        if membership:
            membership.delete()
            return Response({'status': 'left'}, status=status.HTTP_200_OK)
        return Response({'status': 'not a member'}, status=status.HTTP_400_BAD_REQUEST)

class MyCommunitiesView(generics.ListAPIView):
    serializer_class = CommunityGroupSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CommunityGroup.objects.filter(memberships__user=self.request.user)

class InviteToCommunityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, community_id):
        community = get_object_or_404(CommunityGroup, id=community_id)
        if community.privacy != 'private':
            return Response({'error': 'Only private groups support invitations.'}, status=400)

        username = request.data.get('username')
        user = get_object_or_404(User, username=username)

        CommunityMembership.objects.get_or_create(user=user, community=community)
        return Response({'status': 'invited'}, status=201)
    
class FilteredImageListView(generics.ListAPIView):
    serializer_class = GeneratedImageSerializer

    def get_queryset(self):
        queryset = GeneratedImage.objects.filter(is_published=True)
        field = self.request.query_params.get('field')
        prompt = self.request.query_params.get('prompt')
        date = self.request.query_params.get('date')
        sort = self.request.query_params.get('sort')

        if field:
            try:
                queryset = queryset.filter(field_id=int(field))
            except ValueError:
                pass

        if prompt:
            queryset = queryset.filter(prompt__icontains=prompt)

        if date:
            queryset = queryset.filter(created_at__date=date)

        if sort == "upvotes":
            queryset = queryset.annotate(upvote_count=Count("upvotes")).order_by("-upvote_count")
        elif sort == "comments":
            queryset = queryset.annotate(comment_count=Count("comments")).order_by("-comment_count")
        else:
            queryset = queryset.order_by("-created_at")

        return queryset


class GeneratedImageDetailView(generics.RetrieveAPIView):
    queryset = GeneratedImage.objects.all()
    serializer_class = GeneratedImageSerializer
    permission_classes = [AllowAny]
    lookup_field = 'id'
    lookup_url_kwarg = 'image_id'


class PublicImageListView(generics.ListAPIView):
    queryset = GeneratedImage.objects.filter(is_published=True).order_by('-created_at')
    serializer_class = GeneratedImageSerializer
    permission_classes = [AllowAny]


class PublishImageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        image_url = request.data.get("image_url")
        image_name = request.data.get("image_name")
        prompt = request.data.get("prompt")
        field_id = request.data.get("field")

        image = GeneratedImage.objects.filter(user=request.user, image_url=image_url).first()
        if not image:
            return Response({"error": "Image not found"}, status=404)

        image.image_title = image_name or image.image_name
        image.user_description = prompt or image.prompt
        image.is_published = True
        image.field_id = field_id or image.field_id
        image.save()

        return Response({"status": "published", "id": image.id}, status=200)


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = ImageCommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        image_id = self.kwargs['image_id']
        return ImageComment.objects.filter(image_id=image_id).order_by('-created_at')

    def perform_create(self, serializer):
        image = get_object_or_404(GeneratedImage, id=self.kwargs['image_id'])
        serializer.save(user=self.request.user, image=image)

class ToggleCommunityPostLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(CommunityPost, id=post_id)
        if request.user in post.likes.all():
            post.likes.remove(request.user)
            return Response({"status": "unliked", "likes": post.likes.count()})
        else:
            post.likes.add(request.user)
            return Response({"status": "liked", "likes": post.likes.count()})
        
class UpvoteToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, image_id):
        image = get_object_or_404(GeneratedImage, id=image_id)
        upvote, created = Upvote.objects.get_or_create(user=request.user, image=image)

        if not created:
            upvote.delete()
            return Response({"status": "unliked", "upvotes": image.upvotes.count()})

        return Response({"status": "liked", "upvotes": image.upvotes.count()})


class RemixImageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, image_id):
        original = get_object_or_404(GeneratedImage, id=image_id)
        remixed_id = request.data.get('remixed_id')
        remixed_image = get_object_or_404(GeneratedImage, id=remixed_id)
        Remix.objects.create(original=original, remixer=request.user, remixed_image=remixed_image)
        return Response({"message": "Remix saved"}, status=201)