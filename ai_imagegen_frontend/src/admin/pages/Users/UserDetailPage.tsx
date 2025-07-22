import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchUserActivity } from "../../api/adminApi";

const UserDetailPage = () => {
  const { userId } = useParams();
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetchUserActivity(parseInt(userId!, 10));
        setActivity(res.data);
      } catch (err) {
        console.error("Failed to fetch user activity", err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [userId]);

  if (loading) return <p className="p-4">Loading user activity...</p>;

  if (!activity) return <p className="p-4 text-red-500">User not found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">User Activity: @{activity.username}</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded shadow">
          <h3 className="font-semibold text-lg">Posts</h3>
          <p>{activity.post_count}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded shadow">
          <h3 className="font-semibold text-lg">Comments</h3>
          <p>{activity.comment_count}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-2">Credit History</h3>
      <div className="overflow-x-auto">
        <table className="w-full table-auto border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Description</th>
              <th className="px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {activity.credit_history.map((entry: any, index: number) => (
              <tr key={index} className="border-t">
                <td className="px-4 py-2">{entry.amount}</td>
                <td className="px-4 py-2 capitalize">{entry.type}</td>
                <td className="px-4 py-2">{entry.description || "-"}</td>
                <td className="px-4 py-2 text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserDetailPage;
