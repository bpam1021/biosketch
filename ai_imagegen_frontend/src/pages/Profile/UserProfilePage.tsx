import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPublicUserProfile, getUserImages } from "../../api/profileApi";
import Sidebar from "../../components/Sidebar";
type PublicUserProfile = {
  username: string;
  profile_picture: string;
  bio: string;
  followers_count: number;
  following_count: number;
  total_images_generated: number;
  total_images_published: number;
  total_likes_received: number;
  challenges_won: number;
};

type Image = {
  id: string;
  image_url: string;
};

const UserProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string; id?: string }>({
    open: false,
    url: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        const [profileRes, imagesRes] = await Promise.all([
          getPublicUserProfile(username),
          getUserImages(username),
        ]);

        setProfile(profileRes.data);
        setImages(Array.isArray(imagesRes.data) ? imagesRes.data : []);
      } catch (err) {
        console.error("❌ Failed to load profile or images", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading profile...</div>;
  if (!profile) return <div className="p-4 text-center text-red-500">User not found.</div>;

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <img
            src={profile.profile_picture || "/default-avatar.png"}
            alt="User Avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
          />
          <div>
            <h2 className="text-2xl font-bold">{profile.username}</h2>
            <p className="text-gray-600">{profile.bio}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-500">
              <span>👥 Followers: {profile.followers_count}</span>
              <span>🔗 Following: {profile.following_count}</span>
              <span>🖼️ Images: {profile.total_images_generated}</span>
              <span>🖼️ Images: {profile.total_images_published}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">📊 Stats</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <div>❤️ Likes Received: {profile.total_likes_received}</div>
            <div>🏆 Challenges Won: {profile.challenges_won}</div>
          </div>
        </div>

        {/* Gallery */}
        <h3 className="text-xl font-semibold mb-4">🖼️ Recent Images</h3>
        {images.length === 0 ? (
          <p className="text-gray-500 italic">No published images yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                loading="lazy"
                alt="User upload"
                className="rounded-lg h-32 w-full object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => setImageModal({ open: true, url: img.image_url, id: img.id })}
              />
            ))}
          </div>
        )}

        {/* Modal Viewer */}
        {imageModal.open && (
          <div
            onClick={() => setImageModal({ open: false, url: "" })}
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
          >
            <div className="relative max-w-full max-h-full p-4">
              <img
                src={imageModal.url}
                alt="Full view"
                className="max-w-full max-h-screen object-contain rounded shadow-lg"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => handleDownload(imageModal.url, `user_image_${imageModal.id}.png`)}
                className="absolute top-2 right-2 bg-white text-black text-xs px-3 py-1 rounded hover:bg-gray-100"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
