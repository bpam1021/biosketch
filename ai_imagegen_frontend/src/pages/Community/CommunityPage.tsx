// src/pages/Community/CommunityPage.tsx
import { useEffect, useState } from "react";
import { getAllCommunities } from "../../api/communityApi";
import { useNavigate } from "react-router-dom";
import CommunityFilterPanel from "../../components/Community/CommunityFilterPanel";
import { CommunityGroup } from "../../types/CommunityTypes";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../../components/Sidebar";

const CommunityPage = () => {
  const [communities, setCommunities] = useState<CommunityGroup[]>([]);
  const [filtered, setFiltered] = useState<CommunityGroup[]>([]);
  const [sortBy, setSortBy] = useState<"members" | "images" | "name">("members");
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    getAllCommunities()
      .then((res) => {
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
            ? res.data.results
            : [];
        const filteredData = data.filter((group: CommunityGroup) => {
          if (group.is_banned || group.is_deleted) return false;
          if (!group.is_approved && group.creator_username !== currentUser?.username) return false;
          return true;
        });

        setCommunities(filteredData);
        setFiltered(filteredData);
      })
      .catch((err) => {
        console.error("Failed to fetch communities", err);
        setCommunities([]);
        setFiltered([]);
      });
  }, [currentUser]);

  const handleFilterChange = (filters: {
    name?: string;
    creator?: string;
    privacy?: string;
    minMembers?: number;
    minImages?: number;
  }) => {
    let result = [...communities];

    if (filters.name)
      result = result.filter((c) =>
        c.name.toLowerCase().includes(filters.name!.toLowerCase())
      );

    if (filters.creator)
      result = result.filter((c) =>
        c.creator_username.toLowerCase().includes(filters.creator!.toLowerCase())
      );

    if (filters.privacy)
      result = result.filter((c) => c.privacy === filters.privacy);

    if (filters.minMembers)
      result = result.filter((c) => c.member_count >= filters.minMembers!);

    if (filters.minImages)
      result = result.filter((c) => c.post_count >= filters.minImages!);

    setFiltered(result);
  };

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "members") return b.member_count - a.member_count;
    if (sortBy === "images") return b.post_count - a.post_count;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🧑‍🤝‍🧑 Community Groups</h1>
          <button
            onClick={() => navigate("/community/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ➕ Create Community
          </button>
        </div>

        <CommunityFilterPanel onFilterChange={handleFilterChange} />

        <div className="flex justify-end mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="p-2 border rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="members">👥 Most Members</option>
            <option value="images">🖼️ Most Images</option>
            <option value="name">🔤 Name (A-Z)</option>
          </select>
        </div>

        {sorted.length === 0 ? (
          <p className="text-gray-500 text-center mt-12 text-lg">No matching communities found.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((group) => (
              <div
                key={group.id}
                onClick={() => navigate(`/community/${group.id}`)}
                className="cursor-pointer bg-white rounded-2xl border border-gray-200 shadow hover:shadow-lg transition-all overflow-hidden"
              >
                {group.group_image && (
                  <img
                    src={group.group_image}
                    alt={group.name}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {group.name}
                    {!group.is_approved && group.creator_username === currentUser?.username && (
                      <span className="ml-2 text-sm text-yellow-500">(Pending Approval)</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{group.description}</p>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">👤 {group.creator_username}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full">🔐 {group.privacy}</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full">👥 {group.member_count} members</span>
                    <span className="bg-gray-100 px-2 py-1 rounded-full">🖼️ {group.post_count} images</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
