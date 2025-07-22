import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";

type LeaderboardUser = {
  id: number;
  username: string;
  avatar_url: string | null;
  total_images_generated: number;
  total_images_published: number;
  total_upvotes: number;
  followers_count: number;
};

const DEFAULT_AVATAR = "/default-avatar.jpeg";

const LeaderboardPage = () => {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axiosClient.get("/users/leaderboard/");
        setUsers(res.data);
      } catch (err) {
        console.error("❌ Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-6 text-center">🔥 Leaderboard</h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading leaderboard...</p>
        ) : (
          <div className="space-y-4">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-600 w-6 text-center">{index + 1}</span>
                  <img
                    src={user.avatar_url || DEFAULT_AVATAR}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div>
                    <Link
                      to={`/profile/${user.username}`}
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      @{user.username}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {user.total_images_generated}/{user.total_images_published} images · {user.total_upvotes} upvotes · {user.followers_count} followers
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">User ID #{user.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
