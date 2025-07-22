import { useEffect, useState } from "react";
import { fetchAllFeedback, fetchFeedbackDetail, deleteFeedback } from "../../api/adminApi";
import { FiEye, FiTrash2, FiSearch, FiLoader, FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface Feedback {
  id: number;
  username: string | null;
  name: string;
  email: string;
  message: string;
  submitted_at: string;
}

function AdminFeedbackList() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<number | null>(null);
  const pageSize = 20;

  // Fetch feedbacks
  const fetchList = () => {
    setLoading(true);
    setError(null);

    fetchAllFeedback({ search, page })
      .then(res => {
        // If paginated, use .results; else, fallback
        let data = res.data;
        let feedbacks = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
        setFeedbackList(feedbacks);
        setTotal(data.count || feedbacks.length);
      })
      .catch(() => setError("Failed to load feedback."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line
  }, [page]);

  // Search on enter or search button
  const handleSearch = () => {
    setPage(1); // Always go back to page 1 when searching
    fetchList();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleView = (fb: Feedback) => {
    fetchFeedbackDetail(fb.id).then(res => setSelected(res.data));
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this feedback?")) return;
    setDeleting(id);
    await deleteFeedback(id);
    fetchList();
    setDeleting(null);
    if (selected && selected.id === id) setSelected(null);
  };

  // Pagination controls
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-4xl mx-auto my-10 p-6 bg-white rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-gray-800">Feedback Submissions</h2>
        <div className="flex gap-2">
          <input
            className="px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400 transition text-gray-800"
            placeholder="Search by name, email, or message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            style={{ width: 250 }}
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded transition"
            onClick={handleSearch}
            title="Search"
          >
            <FiSearch />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-blue-600 animate-spin">
          <FiLoader className="text-3xl" />
        </div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : feedbackList.length === 0 ? (
        <div className="text-gray-500 py-10 text-center">No feedback found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border rounded shadow">
              <thead className="bg-blue-50 text-gray-700">
                <tr>
                  <th className="py-2 px-3 font-semibold">Date</th>
                  <th className="py-2 px-3 font-semibold">User</th>
                  <th className="py-2 px-3 font-semibold">Name</th>
                  <th className="py-2 px-3 font-semibold">Email</th>
                  <th className="py-2 px-3 font-semibold">Preview</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map(fb => (
                  <tr key={fb.id} className="even:bg-gray-50 hover:bg-blue-50 transition">
                    <td className="py-2 px-3 whitespace-nowrap">{new Date(fb.submitted_at).toLocaleString()}</td>
                    <td className="py-2 px-3">{fb.username || "-"}</td>
                    <td className="py-2 px-3">{fb.name}</td>
                    <td className="py-2 px-3">{fb.email}</td>
                    <td className="py-2 px-3">{fb.message.length > 50 ? fb.message.slice(0, 50) + "…" : fb.message}</td>
                    <td className="py-2 px-3 flex gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 transition"
                        onClick={() => handleView(fb)}
                        title="View full"
                      >
                        <FiEye />
                      </button>
                      <button
                        className="text-red-500 hover:text-red-700 transition disabled:opacity-60"
                        disabled={deleting === fb.id}
                        onClick={() => handleDelete(fb.id)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-5">
            <span className="text-gray-600 text-sm">
              Page {page} of {totalPages} ({total} feedback)
            </span>
            <div className="flex gap-1">
              <button
                className="p-2 rounded disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <FiChevronLeft />
              </button>
              {[...Array(totalPages).keys()].slice(Math.max(page - 2, 0), Math.min(page + 1, totalPages)).map(p =>
                <button
                  key={p + 1}
                  className={`px-3 py-1 rounded ${page === p + 1 ? "bg-blue-600 text-white" : "hover:bg-blue-100 text-blue-700"}`}
                  onClick={() => setPage(p + 1)}
                  disabled={page === p + 1}
                >
                  {p + 1}
                </button>
              )}
              <button
                className="p-2 rounded disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Feedback Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-lg relative">
            <button
              className="absolute top-3 right-4 text-gray-500 hover:text-red-500 text-xl"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-1 text-gray-800">Feedback from {selected.name}</h3>
            <div className="text-gray-500 mb-4 text-sm">{selected.email} {selected.username && `(user: ${selected.username})`}</div>
            <div className="bg-gray-100 p-4 rounded text-gray-800 mb-4" style={{ whiteSpace: 'pre-wrap' }}>
              {selected.message}
            </div>
            <div className="text-xs text-gray-400 text-right">
              Submitted: {new Date(selected.submitted_at).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFeedbackList;
