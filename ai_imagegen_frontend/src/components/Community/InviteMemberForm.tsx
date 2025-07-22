import { useState } from "react";
import { inviteToPrivateCommunity } from "../../api/communityApi";
import { toast } from "react-toastify";

interface InviteMemberFormProps {
  groupId: number;
}

const InviteMemberForm: React.FC<InviteMemberFormProps> = ({ groupId }) => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }

    setLoading(true);
    try {
      await inviteToPrivateCommunity(groupId, username.trim());
      toast.success(`✅ Invitation sent to @${username}`);
      setUsername("");
    } catch (err: any) {
      console.error("❌ Invitation failed", err);
      toast.error(err.response?.data?.error || "Failed to send invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow border mt-6">
      <h3 className="text-lg font-semibold mb-2">📩 Invite Member</h3>
      <p className="text-sm text-gray-600 mb-3">Invite a user by username to join this private group.</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 px-3 py-2 border rounded text-sm"
        />
        <button
          onClick={handleInvite}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Inviting..." : "Invite"}
        </button>
      </div>
    </div>
  );
};

export default InviteMemberForm;
