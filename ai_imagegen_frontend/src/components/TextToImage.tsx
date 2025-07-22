import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCredits } from "../context/CreditsContext";
import { Listbox } from "@headlessui/react";

const styles = ["3D Render", "Scientific illustration", "Infographic", "Sketch"];

const GPT_IMAGE_SIZES = [
  { label: "1024x1024 (Square)", value: "1024x1024" },
  { label: "1536x1024 (Landscape)", value: "1536x1024" },
  { label: "1024x1536 (Portrait)", value: "1024x1536" },
];

const gptqualityOptions = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

// Hover preview mapping
const stylePreviews: Record<string, string> = {
  "3D Render": "/examples/3d.jpg",
  "Scientific illustration": "/examples/scientific.jpg",
  "Infographic": "/examples/infographic.jpg",
  "Sketch": "/examples/sketch.jpg",
};

interface TextToImageProps {
  onGenerate: (requestData: {
    prompt: string;
    style: string;
    aspectRatio: string;
    numImages: number;
    model: string;
    quality: string;
    whiteBackground: boolean;
  }) => void;
  disabled: boolean;
}

const TextToImage = ({ onGenerate, disabled }: TextToImageProps) => {
  const { credits } = useCredits();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(styles[0]);
  const [aspectRatio, setAspectRatio] = useState(GPT_IMAGE_SIZES[0]);
  const [numImages, setNumImages] = useState(1);
  const [quality, setQuality] = useState("high");
  const [whiteBackground, setWhiteBackground] = useState(false);
  const hasCredits = (credits ?? 0) > 0;

  useEffect(() => {
    if (disabled) {
      setPrompt("");
    }
  }, [disabled]);

  const handleGenerate = () => {
    if (disabled || !prompt.trim() || !hasCredits) return;

    const requestData = {
      model: "gpt-image-1",
      prompt,
      style,
      aspectRatio: aspectRatio.value,
      numImages,
      quality,
      whiteBackground,
    };
    onGenerate(requestData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex flex-col space-y-6 min-h-screen"
    >
      <h2 className="text-xl font-semibold !text-gray-100">Generate AI Image</h2>

      <textarea
        className="border border-gray-100 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-50 h-36 placeholder-gray-100 text-white bg-gray-800"
        placeholder="Enter a prompt..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <fieldset className="relative">
        <legend className="text-sm font-medium text-gray-100">Select Style</legend>
        <div className="flex flex-col mt-2 space-y-2 relative z-10">
          {styles.map((s) => (
            <div key={s} className="relative group">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="style"
                  value={s}
                  checked={style === s}
                  onChange={() => setStyle(s)}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-gray-100 rounded-full flex items-center justify-center peer-checked:border-blue-500 peer-checked:bg-blue-500">
                  <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                </div>
                <span className="text-gray-100 text-sm">{s}</span>
              </label>
            </div>
          ))}
        </div>

        <motion.div
          key={style} // animate preview on style change
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-64 z-50 bg-gray-800 text-white p-3 rounded-lg shadow-xl border border-gray-700 mt-4"
        >
          <motion.img
            src={stylePreviews[style]}
            alt={`${style} preview`}
            className="w-full rounded-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </fieldset>


      <div>
        <label className="text-sm font-medium text-gray-100 mb-2 block">Aspect Ratio</label>
        <Listbox value={aspectRatio} onChange={setAspectRatio}>
          <div className="relative">
            <Listbox.Button className="w-full bg-gray-800 border border-gray-600 text-left p-3 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {aspectRatio.label}
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 w-full rounded-md shadow-lg bg-gray-900 border border-gray-700 text-white z-20">
              {GPT_IMAGE_SIZES.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt}
                  className={({ active, selected }) =>
                    `cursor-pointer select-none px-4 py-2 text-sm ${active
                      ? "bg-blue-600 text-white"
                      : selected
                        ? "bg-gray-700 text-white"
                        : "text-gray-300"
                    }`
                  }
                >
                  {opt.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-100 mb-2 block">Quality</label>
        <Listbox value={quality} onChange={setQuality}>
          <div className="relative">
            <Listbox.Button className="w-full bg-gray-800 border border-gray-600 text-left p-3 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {gptqualityOptions.find((q) => q.value === quality)?.label}
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 w-full rounded-md shadow-lg bg-gray-900 border border-gray-700 text-white z-20">
              {gptqualityOptions.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  className={({ active, selected }) =>
                    `cursor-pointer select-none px-4 py-2 text-sm ${active
                      ? "bg-blue-600 text-white"
                      : selected
                        ? "bg-gray-700 text-white"
                        : "text-gray-300"
                    }`
                  }
                >
                  {opt.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-100">
          Number of Images: {numImages}
        </label>
        <input
          type="range"
          min="1"
          max="4"
          value={numImages}
          onChange={(e) => setNumImages(Number(e.target.value))}
          className="w-full accent-blue-500"
          disabled={(credits ?? 0) < 1}
        />
        {numImages > (credits ?? 0) && (
          <p className="text-sm text-red-400 mt-1">
            You only have {credits} credit{credits === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="whiteBackground"
          checked={whiteBackground}
          onChange={() => setWhiteBackground(!whiteBackground)}
          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        <label htmlFor="whiteBackground" className="text-sm text-gray-100">
          Generate with white background
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-blue-600 text-white py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all"
        disabled={disabled || !prompt}
        onClick={handleGenerate}
      >
        Generate
      </motion.button>
    </motion.div>
  );
};

export default TextToImage;
