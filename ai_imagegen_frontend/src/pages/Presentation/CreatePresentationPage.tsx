import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPresentation, listPresentations } from "../../api/presentationApi";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import { Presentation, PresentationOptions } from "../../types/Presentation";
import { useCredits } from "../../context/CreditsContext";
import PresentationTypeSelector from "../../components/Presentation/PresentationTypeSelector";

const CreatePresentationPage = () => {
  const [step, setStep] = useState<'select' | 'create' | 'configure'>('select');
  const [presentationType, setPresentationType] = useState<'document' | 'slides' | null>(null);
  const [presentationOptions, setPresentationOptions] = useState<PresentationOptions | null>(null);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const { credits, fetchCredits } = useCredits();
  const navigate = useNavigate();

  useEffect(() => {
    const loadPresentations = async () => {
      try {
        const data = await listPresentations();
        setPresentations(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load previous presentations");
      }
    };
    loadPresentations();
  }, []);

  const handleTypeSelect = (type: 'document' | 'slides', options?: PresentationOptions) => {
    setPresentationType(type);
    setPresentationOptions(options || null);
    setStep('create');
  };
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      toast.error("Prompt is required");
      return;
    }

    setLoading(true);
    try {
      const presentation = await createPresentation(
        title || "Untitled", 
        prompt, 
        quality,
        presentationType!,
        presentationOptions || undefined
      );
      fetchCredits();
      navigate(`/presentation/${presentation.id}`);
    } catch (err) {
      toast.error("Failed to create presentation.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (credits === 0) {
      toast.info("You’ve run out of credits. Redirecting to subscription...");
      navigate("/subscribe");
    }
  }, [credits]);

  if (step === 'select') {
    return (
      <div className="flex min-h-screen bg-gray-100 overflow-hidden">
        <Sidebar />
        <div className="flex-1 min-h-screen bg-gray-50 p-6 overflow-y-auto">
          <PresentationTypeSelector onSelect={handleTypeSelect} />
        </div>
      </div>
    );
  }
  return (
  <div className="flex min-h-screen bg-gray-100 overflow-hidden">
    <Sidebar />
    <div className="flex-1 min-h-screen bg-gray-50 p-6 space-y-10 overflow-y-auto">
      {/* Back Button */}
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setStep("select")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          ← Back to Type Selection
        </button>
      </div>

      {credits !== null && credits <= 5 && (
        <div className="flex justify-center my-10">
          <button
            onClick={() => navigate("/subscribe")}
            className={`relative inline-flex items-center justify-center px-8 py-4
              bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900
              backdrop-blur-xl border border-amber-400/30 rounded-2xl
              text-amber-300 font-semibold text-lg tracking-wide shadow-xl
              transition-all duration-300 ease-in-out group overflow-hidden glow-pulse`}
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent
              opacity-0 group-hover:opacity-10 transition duration-500 rounded-2xl pointer-events-none" />
            <span className="mr-3 text-2xl animate-credit-bounce">💳</span>
            {credits === 0 ? "Buy Credits Now" : "Buy More Credits"}
          </button>
        </div>
      )}

      <div className="bg-white shadow-lg rounded-xl p-8 max-w-2xl mx-auto space-y-6 border border-gray-200">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-800">
            Create New {presentationType === "document" ? "Document" : "Slide Presentation"}
          </h1>
          <p className="text-gray-600 mt-2">
            {presentationType === "document"
              ? "Rich document with smart diagram conversion"
              : "Interactive slides with animations and video export"}
          </p>

          {presentationOptions && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {presentationOptions.theme}
                </span>
                {presentationType === "slides" && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {presentationOptions.slide_size}
                  </span>
                )}
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                  {presentationOptions.content_depth}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">
            Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              presentationType === "document"
                ? "Enter content topic (e.g. Write a comprehensive guide about machine learning...)"
                : "Enter presentation topic (e.g. Explain the history of AI...)"
            }
            className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none h-40"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as "low" | "medium" | "high")}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="low">Low (0.5 credits)</option>
            <option value="medium">Medium (1.5 credits)</option>
            <option value="high">High (5 credits)</option>
          </select>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white font-medium px-6 py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
        >
          {loading && <Loader2 className="animate-spin w-5 h-5" />}
          {loading
            ? "Generating..."
            : `Generate ${presentationType === "document" ? "Document" : "Presentation"}`}
        </button>
      </div>

      {/* Presentation List */}
      <div className="bg-white shadow-md rounded-xl p-6 max-w-5xl mx-auto border border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Content</h2>
        <ul className="space-y-3">
          {Array.isArray(presentations) &&
            presentations.map((p) => (
              <li
                key={p.id}
                onClick={() => navigate(`/presentation/${p.id}`)}
                className="cursor-pointer p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-700">{p.title}</p>
                  <p className="text-sm text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                    {(p as any).presentation_type || "slides"}
                  </span>
                </div>
                <span className="text-sm text-blue-600">View ➔</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  </div>
);

};

export default CreatePresentationPage;
