import { useState } from "react";
import { toast } from "react-toastify";
import { submitChallengeEntry } from "../../api/challengeApi";

interface ChallengeEntryFormProps {
  challengeId: string;
  onSubmitSuccess: () => void;
}

const ChallengeEntryForm: React.FC<ChallengeEntryFormProps> = ({
  challengeId,
  onSubmitSuccess,
}) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImageFile(file);
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      toast.error("Please select an image before submitting.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("prompt", prompt);

    try {
      await submitChallengeEntry(Number(challengeId), formData);
      setImageFile(null);
      setPrompt("");
      toast.success("✅ Entry submitted successfully!");
      onSubmitSuccess();
    } catch (err: any) {
      console.error("❌ Submission error", err);

      if (
        err.response?.data?.error ===
        "You have already submitted an entry for this challenge."
      ) {
        toast.error("🚫 You've already submitted an entry for this challenge.");
      } else {
        toast.error("Something went wrong while submitting your entry.");
      }
    }
  };

  return (
    <div className="mb-6 bg-white p-4 rounded-2xl shadow-md border border-gray-100">
      <h4 className="text-lg font-semibold mb-2">🎨 Submit Your Entry</h4>
      <label className="block text-sm font-medium mb-1">Upload Image</label>
      <input
        type="file"
        onChange={handleImageChange}
        accept="image/*"
        className="block mb-3 text-sm"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Add a prompt or idea (optional)"
        className="w-full p-3 border rounded-lg text-sm mb-3"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg w-full"
      >
        🚀 Submit
      </button>
    </div>
  );
};

export default ChallengeEntryForm;
