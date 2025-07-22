import { useState } from "react";

interface CommunityFilterPanelProps {
  onFilterChange: (filters: {
    name?: string;
    creator?: string;
    privacy?: string;
    minMembers?: number;
    minImages?: number;
  }) => void;
}

const CommunityFilterPanel: React.FC<CommunityFilterPanelProps> = ({ onFilterChange }) => {
  const [name, setName] = useState("");
  const [creator, setCreator] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [minMembers, setMinMembers] = useState("");
  const [minImages, setMinImages] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      name: name.trim() || undefined,
      creator: creator.trim() || undefined,
      privacy: privacy || undefined,
      minMembers: minMembers ? Number(minMembers) : undefined,
      minImages: minImages ? Number(minImages) : undefined,
    });
  };

  const handleReset = () => {
    setName("");
    setCreator("");
    setPrivacy("");
    setMinMembers("");
    setMinImages("");
    onFilterChange({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-md border border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end mb-6"
    >
      <div>
        <label className="block text-sm text-gray-600 mb-1">Community Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Creator Username</label>
        <input
          type="text"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Privacy</label>
        <select
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Min Members</label>
        <input
          type="number"
          min={0}
          value={minMembers}
          onChange={(e) => setMinMembers(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-600 mb-1">Min Images</label>
        <input
          type="number"
          min={0}
          value={minImages}
          onChange={(e) => setMinImages(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 transition"
        >
          Reset
        </button>
      </div>
    </form>
  );
};

export default CommunityFilterPanel;
