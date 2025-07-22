import { useEffect, useState } from "react";
import { getPostComments, addCommentToPost } from "../../api/communityApi";
interface Comment {
  id: number;
  content: string;
  user: { username: string };
}

interface CommentBoxProps {
  imageId: string;
}

const CommentBox: React.FC<CommentBoxProps> = ({ imageId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    const res = await getPostComments(parseInt(imageId, 10));
    setComments(res.data);
  };

  useEffect(() => {
    fetchComments();
  }, [imageId]);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;

    setLoading(true);
    await addCommentToPost(parseInt(imageId, 10), commentText);
    setCommentText("");
    await fetchComments();
    setLoading(false);
  };

  return (
    <div className="mt-6 p-4 bg-white rounded-xl shadow max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold mb-3">💬 Comments</h3>

      <textarea
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        rows={3}
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition mb-3 resize-none"
        placeholder="Write your comment here..."
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition active:scale-95 disabled:opacity-60"
      >
        {loading ? "Posting..." : "Post Comment"}
      </button>

      <ul className="mt-5 space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm">
            <p className="text-sm text-gray-800">
              <span className="font-semibold text-gray-900">{c.user.username}</span>: {c.content}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CommentBox;
