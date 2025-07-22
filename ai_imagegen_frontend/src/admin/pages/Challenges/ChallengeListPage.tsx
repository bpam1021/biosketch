import { useEffect, useState } from "react";
import {
  fetchChallenges,
  deleteChallenge,
  updateChallenge,
  createChallenge,
} from "../../api/adminApi";
import EditChallengeModal from "../../components/Modals/EditChallengeModal";
import ConfirmActionModal from "../../components/Modals/ConfirmActionModal";

type Challenge = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const ChallengeListPage = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetchChallenges();
      setChallenges(res.data);
    } catch (err) {
      console.error("Failed to load challenges", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleEdit = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedChallenge(null);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteChallenge(deleteTarget.id);
      loadChallenges();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (data.id) {
        await updateChallenge(data.id, data);
      } else {
        await createChallenge(data);
      }
      loadChallenges();
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save challenge", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">🏆 Manage Challenges</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          + Create Challenge
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading challenges...</p>
      ) : challenges.length === 0 ? (
        <p className="text-gray-500 italic">No challenges available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-100 text-sm text-gray-700 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Active</th>
                <th className="px-4 py-2 text-left">Start Date</th>
                <th className="px-4 py-2 text-left">End Date</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge) => (
                <tr
                  key={challenge.id}
                  className="border-t border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 font-medium">{challenge.title}</td>
                  <td className="px-4 py-3">
                    {challenge.is_active ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <span className="text-gray-400">❌</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(challenge.start_date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(challenge.end_date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={() => handleEdit(challenge)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(challenge)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditChallengeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        initialData={selectedChallenge}
      />

      <ConfirmActionModal
        isOpen={!!deleteTarget}
        message={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ChallengeListPage;
