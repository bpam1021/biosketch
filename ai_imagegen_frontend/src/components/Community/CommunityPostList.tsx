import { useState } from "react";
import {
  getPostComments,
  addCommentToPost,
  toggleCommunityPostLike,
} from "../../api/communityApi";
import { CommunityPost } from "../../types/CommunityTypes";

interface CommunityPostListProps {
  posts?: CommunityPost[];
  refreshPosts: () => void;
}

const CommunityPostList: React.FC<CommunityPostListProps> = ({
  posts = [],
  refreshPosts,
}) => {
  const [commentsVisible, setCommentsVisible] = useState<Record<number, boolean>>({});
  const [newComments, setNewComments] = useState<Record<number, string>>({});
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    url: string;
    post?: CommunityPost;
  }>({ open: false, url: "" });

  const handleLike = async (postId: number) => {
    await toggleCommunityPostLike(postId);
    refreshPosts();
  };

  const toggleComments = async (postId: number) => {
    if (!commentsVisible[postId]) {
      const res = await getPostComments(postId);
      setComments((prev) => ({ ...prev, [postId]: res.data }));
    }
    setCommentsVisible((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = async (postId: number) => {
    const content = newComments[postId];
    if (!content.trim()) return;
    await addCommentToPost(postId, content);
    setNewComments((prev) => ({ ...prev, [postId]: "" }));
    toggleComments(postId); // refresh
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  if (!posts.length) {
    return <p className="text-gray-500 italic">No posts yet in this community.</p>;
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg text-gray-800">{post.title}</h3>
            <button
              onClick={() => handleLike(post.id)}
              className="text-red-600 hover:underline text-sm"
            >
              ❤️ {post.likes_count} Likes
            </button>
          </div>

          {post.image && (
            <img
              src={post.image}
              alt="Preview"
              onClick={() => setImageModal({ open: true, url: post.image || "", post })}
              className="w-full max-h-56 object-cover rounded cursor-pointer mb-3 hover:opacity-90 transition"
            />
          )}

          <p className="text-sm text-gray-700 mb-2">{post.content}</p>
          <p className="text-xs text-gray-400">
            Posted by <span className="font-medium">@{post.user_username}</span>
          </p>

          <button
            onClick={() => toggleComments(post.id)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            💬 {commentsVisible[post.id] ? "Hide Comments" : "Show Comments"}
          </button>

          {commentsVisible[post.id] && (
            <div className="mt-3 space-y-3">
              <ul className="space-y-2">
                {(comments[post.id] || []).map((c) => (
                  <li key={c.id} className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    <span className="font-medium">@{c.user_username}</span>: {c.content}
                  </li>
                ))}
              </ul>

              <textarea
                rows={2}
                value={newComments[post.id] || ""}
                onChange={(e) =>
                  setNewComments((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                placeholder="Write a comment..."
                className="w-full p-2 border rounded text-sm"
              />
              <button
                onClick={() => handleCommentSubmit(post.id)}
                className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
              >
                Post
              </button>
            </div>
          )}
        </div>
      ))}

      {imageModal.open && (
        <div
          onClick={() => setImageModal({ open: false, url: "" })}
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center"
        >
          <div className="relative max-w-full max-h-full overflow-auto touch-pan-y p-4">
            <img
              src={imageModal.url}
              alt="Full Preview"
              className="max-w-full max-h-screen object-contain rounded shadow-xl transition-transform duration-300 hover:scale-105"
              style={{ touchAction: "pinch-zoom" }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => handleDownload(imageModal.url, `image_${imageModal.post?.id}.png`)}
              className="absolute top-1 right-1 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded hover:bg-opacity-80"
            >
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPostList;
