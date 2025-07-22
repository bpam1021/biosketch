import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getChallengeLeaderboard, voteChallengeEntry } from "../../api/challengeApi";
import { API_BASE } from "../../constants/constants";
interface LeaderboardEntry {
  id: number;
  user: {
    username: string;
  };
  image: {
    image_url: string;
    image_name: string;
  };
  upvotes: number;
}

const ChallengeLeaderboard = ({ challengeId }: { challengeId: string }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [likedEntries, setLikedEntries] = useState<number[]>([]);

  const fixUrl = (url: string) => {
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await getChallengeLeaderboard(Number(challengeId));
      setEntries(res.data);
    } catch (err) {
      console.error("❌ Failed to load leaderboard", err);
    }
  };

  const handleVote = async (entryId: number) => {
    try {
      await voteChallengeEntry(Number(challengeId), entryId);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, upvotes: entry.upvotes + 1 } : entry
        )
      );
      setLikedEntries((prev) => [...prev, entryId]);
    } catch (err) {
      console.error("❌ Failed to vote", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [challengeId]);

  if (!challengeId) {
    return <p className="text-gray-400">Challenge ID missing. Leaderboard cannot be loaded.</p>;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🏅 Top Entries</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {entries.map((entry, index) => {
          const isTop3 = index < 3;
          const liked = likedEntries.includes(entry.id);

          return (
            <div
              key={entry.id}
              className={`relative bg-white p-4 rounded-2xl shadow-lg border transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isTop3 ? "ring-2 ring-amber-300" : "border-gray-100"
              }`}
            >
              {isTop3 && (
                <div className="absolute -top-3 -left-3 bg-yellow-400 text-white text-xs font-bold px-2 py-1 rounded-br-md rounded-tl-xl shadow">
                  🥇 #{index + 1}
                </div>
              )}

              <img
                src={fixUrl(entry.image.image_url)}
                alt={entry.image.image_name}
                className="w-full h-40 object-cover rounded-lg transition-transform duration-300 hover:scale-105"
              />

              <div className="mt-3 text-sm text-center font-semibold text-gray-800 truncate">
                {entry.user.username}
              </div>

              <div className="mt-1 flex items-center justify-center text-xs text-gray-500 gap-2">
                <button
                  onClick={() => handleVote(entry.id)}
                  disabled={liked}
                  className={`transition transform hover:scale-110 ${
                    liked
                      ? "text-red-600 opacity-50 cursor-not-allowed"
                      : "text-red-500 hover:text-red-600"
                  }`}
                >
                  <Heart size={16} fill={liked ? "red" : "none"} />
                </button>
                <span>{entry.upvotes} upvotes</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChallengeLeaderboard;
