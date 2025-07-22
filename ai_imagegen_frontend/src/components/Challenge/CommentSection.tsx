import { useState, useEffect } from "react";
import { commentOnChallengeEntry, getChallengeEntryDetail } from "../../api/challengeApi";

type Comment = {
  id: number;
  text: string;
  user_username: string;
  created_at: string;
};

type Props = {
  challengeId: string;
  entryId: number;
};

const CommentSection: React.FC<Props> = ({ challengeId, entryId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const toggleComments = () => setShowComments(!showComments);

  const fetchComments = async () => {
    try {
      const res = await getChallengeEntryDetail(Number(challengeId), entryId);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error("❌ Failed to load comments", err);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [challengeId, entryId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await commentOnChallengeEntry(Number(challengeId), entryId, newComment);
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      console.error("❌ Comment submission failed", err);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={toggleComments}
        className="text-sm text-blue-600 hover:underline"
      >
        💬 Comment ({comments.length})
      </button>

      {showComments && (
        <div className="mt-2 border-t pt-2">
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scroll">
            {comments.map((c) => (
              <div key={c.id} className="text-sm text-gray-800">
                <span className="font-semibold">@{c.user_username}</span>: {c.text}
              </div>
            ))}
          </div>

          <textarea
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full p-2 border mt-2 rounded text-sm"
          />
          <button
            onClick={handleSubmit}
            className="mt-1 px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentSection;
