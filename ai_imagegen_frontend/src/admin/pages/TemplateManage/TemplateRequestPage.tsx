import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiInfo } from 'react-icons/fi';
import { toast } from 'react-toastify';
import {
  fetchTemplateRequests,
  updateTemplateRequestStatus,
} from '../../api/adminApi';

interface TemplateRequest {
  id: number;
  username: string;
  message: string;
  submitted_at: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_response: string;
}

const AdminTemplateRequestPage = () => {
  const [requests, setRequests] = useState<TemplateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TemplateRequest | null>(null);
  const [responseText, setResponseText] = useState('');

  const fetchRequests = async () => {
  try {
    setLoading(true);
    const res = await fetchTemplateRequests();
    setRequests(res.data);
  } catch (err) {
    toast.error('Failed to fetch template requests');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (status: 'accepted' | 'rejected') => {
  if (!selected) return;
  try {
    await updateTemplateRequestStatus(selected.id, status, responseText);
    toast.success(`Request ${status}`);
    setSelected(null);
    setResponseText('');
    fetchRequests();
  } catch (err) {
    toast.error('Failed to update request status');
  }
};

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">User Template Requests</h2>
      {loading ? (
        <div>Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-gray-500">No requests found</div>
      ) : (
        <table className="w-full text-left border border-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">Message</th>
              <th className="p-2">Date</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="border-t border-gray-700">
                <td className="p-2">{req.username}</td>
                <td className="p-2 max-w-md truncate">{req.message}</td>
                <td className="p-2">{new Date(req.submitted_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{req.status}</td>
                <td className="p-2">
                  <button
                    onClick={() => setSelected(req)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <FiInfo />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">Review Request</h3>
            <p className="mb-2 text-sm text-gray-300">
              <strong>User:</strong> {selected.username}
            </p>
            <p className="mb-2 text-sm text-gray-300">
              <strong>Message:</strong> {selected.message}
            </p>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="w-full p-2 mb-4 rounded bg-gray-800 border border-gray-600 text-white"
              rows={3}
              placeholder="Write admin response..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleUpdateStatus('accepted')}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <FiCheck /> Accept
              </button>
              <button
                onClick={() => handleUpdateStatus('rejected')}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <FiX /> Reject
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded bg-gray-500 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTemplateRequestPage;
