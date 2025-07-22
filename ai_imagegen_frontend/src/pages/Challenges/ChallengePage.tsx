import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { getActiveChallenges } from "../../api/challengeApi";
import Sidebar from "../../components/Sidebar";

const ChallengePage = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await getActiveChallenges();
        setChallenges(res.data.results);
      } catch (err) {
        console.error("❌ Failed to load challenges", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  const handleParticipate = (challengeId: number) => {
    navigate(`/challenges/${challengeId}`);
  };

  // const handleVote = async (challengeId: number, entryId: number) => {
  //   try {
  //     await voteChallengeEntry(challengeId, entryId);
  //     setChallenges((prev) =>
  //       prev.map((challenge) => ({
  //         ...challenge,
  //         entries: challenge.entries.map((entry: any) =>
  //           entry.id === entryId ? { ...entry, upvotes: entry.upvotes + 1 } : entry
  //         ),
  //       }))
  //     );
  //   } catch (err) {
  //     console.error("❌ Voting failed", err);
  //   }
  // };

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">
          🧠 Scientific Image Challenges
        </h1>

        {loading ? (
          <p className="text-center text-gray-500">Loading challenges...</p>
        ) : challenges.length === 0 ? (
          <p className="text-center text-gray-500">No active challenges.</p>
        ) : (
          challenges.map((challenge) => (
            <div key={challenge.id} className="mb-12 bg-white shadow-sm border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">{challenge.title}</h2>
                <p className="text-gray-600 mt-1">{challenge.description}</p>
                <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                  <span>🕒 {challenge.end_date ? formatDistanceToNowStrict(parseISO(challenge.end_date), { addSuffix: true }) : "No deadline"}</span>
                  <span>👥 {challenge.entries_count || 0} participants</span>
                </div>
                <button
                  onClick={() => handleParticipate(challenge.id)}
                  className="mt-4 inline-block bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  🚀 Participate
                </button>
              </div>
            </div>

          ))
        )}
      </div>
    </div>
  );
};

export default ChallengePage;
