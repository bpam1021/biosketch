from rest_framework import generics, permissions, filters
from users.models import Feedback
from adminpanel.serializers import FeedbackAdminSerializer
from rest_framework.permissions import IsAdminUser

class FeedbackListView(generics.ListAPIView):
    queryset = Feedback.objects.all().order_by('-submitted_at')
    serializer_class = FeedbackAdminSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'message', 'user__username']
    ordering_fields = ['submitted_at', 'name', 'email']

class FeedbackDetailView(generics.RetrieveAPIView):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackAdminSerializer
    permission_classes = [IsAdminUser]
