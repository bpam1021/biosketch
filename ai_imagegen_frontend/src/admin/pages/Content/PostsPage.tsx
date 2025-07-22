import { useEffect, useMemo, useState } from "react";
import { fetchAllPosts, deletePost } from "../../api/adminApi";
import { toast } from "react-toastify";
import ConfirmActionModal from "../../components/Modals/ConfirmActionModal";

interface Post {
  id: number;
  title: string;
  content: string;
  image: string | null;
  user_username: string;
  likes_count: number;
  created_at: string;
}

const PostsPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"title" | "content" | "user_username">("title");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetchAllPosts();
      setPosts(res.data);
    } catch (err) {
      toast.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost) return;
    try {
      await deletePost(selectedPost.id);
      toast.success("Post deleted.");
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id)); // Optimistic update
    } catch {
      toast.error("Failed to delete post.");
    } finally {
      setSelectedPost(null);
    }
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const value = post[searchField] || "";
      return value.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [posts, searchField, debouncedSearchTerm]);

  if (loading) return <p className="p-6 text-gray-600">Loading posts...</p>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2">📝 <span>Moderate Posts</span></h2>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search posts..."
          className="border border-gray-300 px-4 py-2 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="title">Title</option>
          <option value="content">Content</option>
          <option value="user_username">Username</option>
        </select>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center text-gray-500 italic col-span-full">No posts match your search.</div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                <div className="font-semibold text-lg truncate">{post.title}</div>

                {post.image && (
                  <img
                    src={post.image}
                    alt="Post visual"
                    loading="lazy"
                    className="w-full h-40 object-cover rounded-md"
                  />
                )}

                <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>

                <p className="text-xs text-gray-500">
                  By <span className="font-medium">@{post.user_username}</span> • ❤️ {post.likes_count} •{" "}
                  {new Date(post.created_at).toLocaleString()}
                </p>

                <button
                  onClick={() => setSelectedPost(post)}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmActionModal
        isOpen={!!selectedPost}
        onCancel={() => setSelectedPost(null)}
        onConfirm={handleDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
      />
    </div>
  );
};

export default PostsPage;
