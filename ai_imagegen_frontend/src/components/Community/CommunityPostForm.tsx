import { useState } from "react";
import { createCommunityPost } from "../../api/communityApi";
import { toast } from "react-toastify";

interface CommunityPostFormProps {
  groupId: number;
  onPostSuccess?: (data: any) => void; // Allow onPostSuccess to accept a parameter
}

const CommunityPostForm: React.FC<CommunityPostFormProps> = ({
  groupId,
  onPostSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
  
    const formData = new FormData();
    formData.append("title", title);
    if (content) formData.append("content", content);
    if (imageFile) formData.append("image", imageFile);
  
    setSubmitting(true);
    try {
      const res = await createCommunityPost(groupId, formData);
      toast.success("✅ Post submitted!");
      setTitle("");
      setContent("");
      setImageFile(null);
      if (onPostSuccess) onPostSuccess(res.data);  // ✅ Return new post
    } catch (err) {
      toast.error("❌ Failed to post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  

  return (
    <div className="bg-gray-50 p-6 rounded-2xl shadow-sm space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">📝 Create a Post</h3>
  
      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
  
      <textarea
        placeholder="Write something..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full p-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
  
      <div className="flex items-center justify-between">
        <label className="cursor-pointer text-sm text-blue-600 hover:underline">
          📷 Attach image
          <input
            type="file"
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
        </label>
  
        {imageFile && (
          <span className="text-xs text-gray-500 truncate max-w-[50%]">
            {imageFile.name}
          </span>
        )}
      </div>
  
      <div className="text-right">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm rounded-lg disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
};  

export default CommunityPostForm;
