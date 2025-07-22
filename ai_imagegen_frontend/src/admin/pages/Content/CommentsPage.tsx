import { useEffect, useMemo, useState } from "react";
import { fetchAllComments, deleteComment } from "../../api/adminApi";
import { toast } from "react-toastify";
import ConfirmActionModal from "../../components/Modals/ConfirmActionModal";

interface Comment {
  id: number;
  user_username: string;
  content: string;
  created_at: string;
  post_title?: string;
}

const CommentsPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"user_username" | "content" | "post_title">("user_username");

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetchAllComments();
      setComments(res.data);
    } catch (err) {
      toast.error("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedComment) return;
    try {
      await deleteComment(selectedComment.id);
      toast.success("Comment deleted.");
      setComments((prev) => prev.filter((c) => c.id !== selectedComment.id));
    } catch {
      toast.error("Failed to delete comment.");
    } finally {
      setSelectedComment(null);
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      const value = comment[searchField] || "";
      return value.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [comments, debouncedSearchTerm, searchField]);

  if (loading) return <p className="p-6 text-gray-600">Loading comments...</p>;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-3xl font-bold flex items-center gap-2">💬 <span>Moderate Comments</span></h2>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search comments..."
          className="border border-gray-300 px-4 py-2 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as any)}
          className="border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="user_username">Username</option>
          <option value="content">Content</option>
          <option value="post_title">Post Title</option>
        </select>
      </div>

      {/* Comments Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredComments.length === 0 ? (
          <div className="text-center text-gray-500 italic col-span-full">No comments found.</div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl transition-shadow flex justify-between items-start"
            >
              <div className="space-y-1 pr-4">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold">@{comment.user_username}</span> commented:
                </p>
                <p className="text-sm text-gray-600 italic">"{comment.content}"</p>
                {comment.post_title && (
                  <p className="text-xs text-gray-500">
                    On post: <span className="italic">{comment.post_title}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedComment(comment)}
                className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmActionModal
        isOpen={!!selectedComment}
        onCancel={() => setSelectedComment(null)}
        onConfirm={handleDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment?"
      />
    </div>
  );
};

export default CommentsPage;
