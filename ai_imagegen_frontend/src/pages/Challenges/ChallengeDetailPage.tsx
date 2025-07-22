import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getChallengeDetail,
  getChallengeEntries,
  voteChallengeEntry,
  unvoteChallengeEntry,
} from '../../api/challengeApi';
import ChallengeEntryForm from '../../components/Challenge/ChallengeEntryForm';
import ChallengeLeaderboard from '../../components/Challenge/ChallengeLeaderboard';
import CommentSection from '../../components/Challenge/CommentSection';
import { Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import Sidebar from '../../components/Sidebar';
import { API_BASE } from '../../constants/constants';
type Challenge = {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
};

type Entry = {
  id: number;
  image: string;
  prompt: string;
  upvotes: number;
  user_username: string;
  comments?: Comment[];
};

const ChallengeDetailPage = () => {
  const { challengeId } = useParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [likedEntries, setLikedEntries] = useState<number[]>([]);
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    url: string;
    entryId?: number;
  }>({ open: false, url: '' });

  const baseUrl = `${API_BASE}`;
  const fixUrl = (url: string) => (url.startsWith('http') ? url : `${baseUrl}${url}`);

  const fetchChallengeData = async () => {
    if (!challengeId) return;
    try {
      const [challengeRes, entriesRes] = await Promise.all([
        getChallengeDetail(Number(challengeId)),
        getChallengeEntries(Number(challengeId)),
      ]);
      setChallenge(challengeRes.data);
      setEntries(entriesRes.data.results);
    } catch (err) {
      toast.error('❌ Failed to load challenge or entries');
    }
  };

  useEffect(() => {
    fetchChallengeData();
  }, [challengeId]);

  const toggleVote = async (entryId: number) => {
    const alreadyLiked = likedEntries.includes(entryId);
    try {
      if (alreadyLiked) {
        await unvoteChallengeEntry(Number(challengeId), entryId);
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, upvotes: entry.upvotes - 1 } : entry
          )
        );
        setLikedEntries((prev) => prev.filter((id) => id !== entryId));
        toast.success('❎ Vote removed');
      } else {
        await voteChallengeEntry(Number(challengeId), entryId);
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, upvotes: entry.upvotes + 1 } : entry
          )
        );
        setLikedEntries((prev) => [...prev, entryId]);
        toast.success('❤️ Vote added');
      }
    } catch (err) {
      toast.error('❌ Voting failed (maybe already voted?)');
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
    <div className="flex-1 p-6">
      {challenge && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900">{challenge.title}</h2>
          <p className="text-gray-700 text-base mt-2">{challenge.description}</p>
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            ⏳ <span>Deadline: {new Date(challenge.end_date).toLocaleDateString()}</span>
          </p>

          <div className="mt-6 p-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
            <ChallengeEntryForm challengeId={challengeId!} onSubmitSuccess={fetchChallengeData} />
          </div>
        </div>
      )}

      <div className="mt-10">
        <h3 className="text-2xl font-bold mb-6 text-gray-800">🏅 All Entries</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {entries.map((entry) => {
            const liked = likedEntries.includes(entry.id);
            return (
              <div
                key={entry.id}
                className="group border rounded-2xl overflow-hidden bg-white shadow transition transform hover:shadow-xl hover:-translate-y-1"
              >
                <div className="overflow-hidden">
                  <img
                    src={fixUrl(entry.image)}
                    alt={entry.prompt || 'entry image'}
                    className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    onClick={() =>
                      setImageModal({
                        open: true,
                        url: fixUrl(entry.image),
                        entryId: entry.id,
                      })
                    }
                  />
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-gray-800 text-sm line-clamp-2">{entry.prompt}</p>
                  <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    👤 {entry.user_username}
                  </span>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => toggleVote(entry.id)}
                      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition"
                    >
                      <Heart size={16} fill={liked ? 'red' : 'none'} />
                      <span>{entry.upvotes}</span>
                    </button>
                    <span className="text-xs text-gray-400">Votes</span>
                  </div>
                  {challengeId && <CommentSection challengeId={challengeId} entryId={entry.id} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {imageModal.open && (
        <div
          onClick={() => setImageModal({ open: false, url: '' })}
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center"
        >
          <div className="relative max-w-full max-h-full overflow-auto touch-pan-y p-4">
            <img
              src={imageModal.url}
              alt="Zoom"
              className="max-w-full max-h-screen object-contain rounded shadow-xl transition-transform duration-300 hover:scale-105"
              style={{ touchAction: 'pinch-zoom' }}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() =>
                handleDownload(imageModal.url, `submission_${imageModal.entryId || 'entry'}.png`)
              }
              className="absolute top-1 right-1 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded hover:bg-opacity-80"
            >
              Download
            </button>
          </div>
        </div>
      )}

      <ChallengeLeaderboard challengeId={challengeId!} />
    </div>
    </div>
  );
};

export default ChallengeDetailPage;
