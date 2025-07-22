import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import ImageDetail from "../../components/Community/ImageDetail";
import CommentBox from "../../components/Community/CommentBox";

const ImageDetailPage = () => {
  const { imageId } = useParams<{ imageId: string }>();
  const [imageData, setImageData] = useState<any>(null);

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const res = await axiosClient.get(`/community/images/${imageId}/`);
        setImageData(res.data);
      } catch (err) {
        console.error("Image not found or error loading:", err);
      }
    };

    if (imageId) fetchImage();
  }, [imageId]);

  if (!imageData) {
    return <p className="p-6 text-gray-500">Loading image...</p>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ImageDetail image={imageData} />
      <CommentBox imageId={imageId!} />
    </div>
  );
};

export default ImageDetailPage;