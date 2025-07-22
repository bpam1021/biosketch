from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from community.models import Challenge, ChallengeEntry, ChallengeEntryVote, ChallengeEntryComment
from community.serializers import ChallengeSerializer, ChallengeEntrySerializer, ChallengeEntryCommentSerializer


class ChallengeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Challenge.objects.filter(is_active=True).order_by('-start_date')
    serializer_class = ChallengeSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, **kwargs):
        challenge_id = self.kwargs.get("pk") or self.kwargs.get("challenge_pk")
        prompt = request.data.get("prompt", "")
        image = request.FILES.get("image")

        if not image:
            return Response({"error": "Image is required"}, status=status.HTTP_400_BAD_REQUEST)

        challenge = get_object_or_404(Challenge, id=challenge_id)

        if ChallengeEntry.objects.filter(user=request.user, challenge=challenge).exists():
            return Response({"error": "You have already submitted an entry for this challenge."}, status=status.HTTP_400_BAD_REQUEST)

        ChallengeEntry.objects.create(
            challenge=challenge,
            user=request.user,
            image=image,
            prompt=prompt,
        )

        return Response({"message": "Entry submitted successfully"}, status=status.HTTP_201_CREATED)


class ChallengeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = ChallengeEntrySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = ChallengeEntry.objects.select_related('user', 'challenge').prefetch_related('votes', 'comments')
        challenge_id = self.kwargs.get('challenge_pk')
        if challenge_id:
            queryset = queryset.filter(challenge_id=challenge_id)
        return queryset

    def perform_create(self, serializer):
        challenge_id = self.kwargs.get('challenge_pk')
        challenge = get_object_or_404(Challenge, id=challenge_id)
        serializer.save(user=self.request.user, challenge=challenge)

    def retrieve(self, request, *args, **kwargs):
        entry = self.get_object()
        serializer = ChallengeEntrySerializer(entry, context={"request": request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None, challenge_pk=None):
        entry = self.get_object()
        vote, created = ChallengeEntryVote.objects.get_or_create(user=request.user, entry=entry)
        if not created:
            return Response({'detail': 'Already voted'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Vote recorded'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def unvote(self, request, pk=None, challenge_pk=None):
        entry = self.get_object()
        deleted, _ = ChallengeEntryVote.objects.filter(user=request.user, entry=entry).delete()
        if deleted:
            return Response({'detail': 'Vote removed'})
        return Response({'detail': 'You had not voted'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def comment(self, request, pk=None, challenge_pk=None):
        entry = self.get_object()
        text = request.data.get('text')
        if not text:
            return Response({'detail': 'Comment text is required'}, status=status.HTTP_400_BAD_REQUEST)
        comment = ChallengeEntryComment.objects.create(entry=entry, user=request.user, text=text)
        return Response(ChallengeEntryCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class ChallengeLeaderboardView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]

    def list(self, request, *args, **kwargs):
        challenge_id = self.kwargs['challenge_id']
        entries = (
            ChallengeEntry.objects
            .filter(challenge_id=challenge_id)
            .select_related("user")
            .prefetch_related("votes")
        )

        data = []
        for entry in entries:
            image_url = entry.image.url if entry.image else None
            data.append({
                "id": entry.id,
                "user": {"username": entry.user.username},
                "image": {
                    "image_url": image_url,
                    "image_name": entry.title or "image",
                },
                "upvotes": entry.votes.count(),
            })

        data = sorted(data, key=lambda x: x["upvotes"], reverse=True)[:10]
        return Response(data)
