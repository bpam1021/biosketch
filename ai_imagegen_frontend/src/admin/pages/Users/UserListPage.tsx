import { useEffect, useState } from "react";
import { fetchAllUsers, suspendUser, deleteUser } from "../../api/adminApi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmActionModal from "../../components/Modals/ConfirmActionModal";

interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  date_joined: string;
  profile?: {
    bio: string;
    credits: number;
    profile_visibility: string;
  };
}

const UserListPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "delete" | null>(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await fetchAllUsers();
      setUsers(res.data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === "suspend") {
        await suspendUser(selectedUser.id);
        toast.success("User suspended");
      } else {
        await deleteUser(selectedUser.id);
        toast.success("User deleted");
      }
      fetchUsers();
    } catch {
      toast.error("Action failed");
    } finally {
      setSelectedUser(null);
      setActionType(null);
    }
  };

  if (loading) return <p>Loading users...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">User Management</h2>
      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white p-4 rounded shadow flex justify-between items-start"
          >
            <div>
              <p className="font-semibold text-gray-800">@{user.username}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-xs text-gray-400">
                Joined: {new Date(user.date_joined).toLocaleDateString()}
              </p>
              {user.profile && (
                <p className="text-xs text-gray-500">
                  Credits: {user.profile.credits} | Visibility: {user.profile.profile_visibility}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                onClick={() => navigate(`/users/${user.id}`)}
              >
                View
              </button>
              {user.is_active && (
                <button
                  className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                  onClick={() => {
                    setSelectedUser(user);
                    setActionType("suspend");
                  }}
                >
                  Suspend
                </button>
              )}
              <button
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                onClick={() => {
                  setSelectedUser(user);
                  setActionType("delete");
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmActionModal
        isOpen={!!selectedUser}
        onCancel={() => setSelectedUser(null)}
        onConfirm={handleAction}
        title={actionType === "delete" ? "Delete User" : "Suspend User"}
        message={`Are you sure you want to ${actionType} this user?`}
      />
    </div>
  );
};

export default UserListPage;