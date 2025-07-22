import { useEffect, useState } from "react";
import { getMyCommunities } from "../../api/communityApi";
import { useNavigate } from "react-router-dom";
import { CommunityGroup } from "../../types/CommunityTypes";
import CommunityCard from "../../components/Community/CommunityCard";

const MyCommunitiesPage = () => {
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await getMyCommunities();
        setGroups(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch joined communities", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center sm:text-left">
        🫂 My Community Groups
      </h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading communities...</p>
      ) : groups.length === 0 ? (
        <p className="text-center text-gray-500 italic">
          You're not part of any community yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <CommunityCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate("/community/create")}
          className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg shadow font-medium"
        >
          ➕ Create New Community
        </button>
      </div>
    </div>
  );
};

export default MyCommunitiesPage;
