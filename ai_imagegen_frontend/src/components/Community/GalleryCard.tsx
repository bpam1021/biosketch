import { useNavigate } from "react-router-dom";

interface GalleryCardProps {
  image: {
    id: number;
    image_url: string;
    image_name: string;
    upvotes: number;
    user: {
      username: string;
    };
  };
}

const GalleryCard: React.FC<GalleryCardProps> = ({ image }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-xl transition cursor-pointer"
      onClick={() => navigate(`/community/image/${image.id}`)}
    >
      <img
        src={image.image_url}
        alt={image.image_name}
        className="w-full h-48 object-cover rounded-t-lg"
      />
      <div className="p-2">
        <h3 className="text-sm font-semibold truncate">{image.image_name}</h3>
        <p className="text-xs text-gray-500">By {image.user.username}</p>
        <p className="text-xs text-gray-500">👍 {image.upvotes}</p>
      </div>
    </div>
  );
};

export default GalleryCard;