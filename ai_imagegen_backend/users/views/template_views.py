from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.generics import ListAPIView
from collections import defaultdict
from django.db.models import Q, Exists, OuterRef
from users.models import TemplateCategory, TemplateImage
from users.serializers import TemplateRequestSerializer, TemplateRequest, TemplateImageSerializer

class TemplateTreeView(APIView):
    def get(self, request):
        images = TemplateImage.objects.all().select_related('category')

        tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))

        for img in images:
            source = img.source
            type_ = img.type or 'default'
            category = img.category.name if img.category else None
            img_data = {
                "id": img.id,
                "name": img.name,
                "image": request.build_absolute_uri(img.image.url),
                "source": img.source,
                "type": img.type,
            }
            tree[source][type_][category].append(img_data)

        def build_tree():
            result = []
            for source, types in tree.items():
                type_nodes = []
                for type_, categories in types.items():
                    # Separate images with and without categories
                    category_nodes = []
                    uncategorized_imgs = []
                    for category, imgs in categories.items():
                        if category is None:
                            uncategorized_imgs.extend(imgs)
                        else:
                            category_nodes.append({
                                "label": category,
                                "children": [
                                    {"label": img["name"], "image": img}
                                    for img in imgs
                                ]
                            })

                    children = category_nodes
                    if uncategorized_imgs:
                        children += [
                            {"label": img["name"], "image": img}
                            for img in uncategorized_imgs
                        ]

                    type_nodes.append({
                        "label": type_.upper(),
                        "children": children
                    })

                result.append({
                    "label": source.capitalize(),
                    "children": type_nodes
                })

            return result

        return Response(build_tree())

class TemplateImageSearchView(ListAPIView):
    serializer_class = TemplateImageSerializer
    pagination_class = None  # ✅ disables pagination just for this view

    def get_queryset(self):
        q = self.request.GET.get("q", "").strip()
        if not q:
            return TemplateImage.objects.none()

        # Full-text search
        search_vector = SearchVector('name', config='english')
        search_query = SearchQuery(q, config='english')

        qs = (
            TemplateImage.objects
            .annotate(rank=SearchRank(search_vector, search_query))
            .filter(rank__gte=0.1)
            .order_by('-rank')
        )

        # Fallback to icontains
        if not qs.exists():
            qs = TemplateImage.objects.filter(name__icontains=q).order_by("name")

        return qs

    
# class PublicTemplateCategoryView(APIView):
#     def get(self, request):
#         query = request.GET.get("q")
#         image_type = request.GET.get("type")
#         qs = TemplateCategory.objects.all()
#         if image_type:
#             qs = qs.annotate(
#                 has_type_image=Exists(
#                     TemplateImage.objects.filter(
#                         category=OuterRef('pk'),
#                         type=image_type
#                     )
#                 )
#             ).filter(has_type_image=True)
#         if query:
#             qs = qs.filter(Q(name__icontains=query) | Q(images__name__icontains=query)).distinct()
        
#         serializer = TemplateCategoryWithImagesSerializer(
#             qs.order_by("name"),
#             many=True,
#             context={"request": request, "query": query, "type": image_type}
#         )
#         data = serializer.data
#         if query:
#             data = [cat for cat in data if cat['images']]
#         return Response(data)


class TemplateRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TemplateRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

class TemplateRequestStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        requests = TemplateRequest.objects.filter(user=request.user).order_by('-submitted_at')
        serializer = TemplateRequestSerializer(requests, many=True)
        return Response(serializer.data)
