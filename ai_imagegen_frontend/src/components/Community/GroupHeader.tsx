import React, { useState } from "react";
import { CommunityGroup } from "../../types/CommunityTypes";
import DOMPurify from "dompurify";

interface GroupHeaderProps {
  group: CommunityGroup;
  isMember: boolean;
  onJoin: () => Promise<void>;
  onLeave: () => void;
  currentUser: { username: string } | null;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  isMember,
  onJoin,
  onLeave,
  currentUser,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCreator = currentUser?.username === group.creator_username;
  const handleJoinClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmJoin = async () => {
    setShowConfirmModal(false);
    await onJoin();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow space-y-4">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">{group.name}</h2>
        <p className="text-sm text-gray-500">
          Created by <span className="font-medium">{group.creator_username}</span>
        </p>
        <p className="text-xs text-gray-400">
          🛡 {group.privacy === "private" ? "Private Group" : "Public Group"} • 👥 {group.member_count} members • 🖼 {group.post_count} images
        </p>
      </div>

      {group.compliance_rules && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-sm prose max-w-none">
          <h3 className="font-semibold text-gray-800 mb-2">📜 Community Rules</h3>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(group.compliance_rules || "No rules provided."),
            }}
          />
        </div>
      )}

      {!isCreator && (
        <div>
          {isMember ? (
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded hover:bg-red-200 transition"
            >
              Leave Group
            </button>
          ) : (
            <button
              onClick={handleJoinClick}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Join Group
            </button>
          )}
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirm Join</h3>
            <p className="text-sm text-gray-700 mb-4">
              Do you agree to the community rules and wish to join <strong>{group.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                I Agree & Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupHeader;
