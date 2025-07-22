import { useEffect, useState } from "react";
import { CommunityMember } from "../../types/CommunityTypes";
import { getCommunityDetail } from "../../api/communityApi";
import { getPublicUserProfile } from "../../api/profileApi";
import Modal from "./Modal";
import { followUser, unfollowUser } from "../../api/profileApi";
import { useAuth } from "../../context/AuthContext";
interface GroupMemberListProps {
  groupId: number;
}

const GroupMemberList: React.FC<GroupMemberListProps> = ({ groupId }) => {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [creatorUsername, setCreatorUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();

  const handleFollow = async () => {
    try {
      await followUser(selectedUser.username);
      setSelectedUser((prev: any) => ({
        ...prev,
        is_following: true,
        followers_count: prev.followers_count + 1,
      }));
    } catch (err) {
      console.error("Follow failed", err);
    }
  };

  const handleUnfollow = async () => {
    try {
      await unfollowUser(selectedUser.username);
      setSelectedUser((prev: any) => ({
        ...prev,
        is_following: false,
        followers_count: prev.followers_count - 1,
      }));
    } catch (err) {
      console.error("Unfollow failed", err);
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await getCommunityDetail(groupId);
        setCreatorUsername(res.data.creator_username);
        setMembers(res.data.members || []);
      } catch (err) {
        console.error("❌ Failed to load members", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [groupId]);

  const openProfileModal = async (username: string) => {
    try {
      const res = await getPublicUserProfile(username);
      setSelectedUser(res.data);
      setShowModal(true);
    } catch (err) {
      console.error("❌ Failed to load user profile", err);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading members...</p>;

  return (
    <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300 mt-6">

      <h3 className="text-lg font-semibold mb-4">👥 Members</h3>
      <ul className="divide-y divide-gray-100">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 py-3 cursor-pointer hover:bg-gray-50 px-2 rounded transition"
            onClick={() => openProfileModal(member.user_username)}
          >
            {/* Avatar */}
            {member.profile_image ? (
              <img
                src={member.profile_image}
                alt={member.user_username}
                className="w-8 h-8 rounded-full object-cover border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                {member.user_username.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Username + Role */}
            <div className="flex-1 text-sm text-gray-800">
              <span className="font-medium">@{member.user_username}</span>
              {member.user_username === creatorUsername && (
                <span className="ml-2 inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  Community Owner
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Profile Modal */}
      {showModal && selectedUser && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header: Avatar + Basic Info */}
            <div className="flex items-center gap-4">
              {selectedUser.profile_picture ? (
                <img
                  src={selectedUser.profile_picture}
                  alt={`${selectedUser.username}'s avatar`}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-2xl">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">@{selectedUser.username}</h2>
                <p className="text-sm text-gray-600">
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedUser.bio || "No bio provided."}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
              <div>👥 <strong>{selectedUser.followers_count}</strong> Followers</div>
              <div>🔗 <strong>{selectedUser.following_count}</strong> Following</div>
              <div>🖼️ <strong>{selectedUser.total_images_generated}</strong> Images Generated</div>
              <div>🖼️ <strong>{selectedUser.total_images_published}</strong> Images Published</div>
              <div>📝 <strong>{selectedUser.total_community_posts}</strong> Posts</div>
              <div>🏁 <strong>{selectedUser.total_challenge_entries}</strong> Challenge Entries</div>
              <div>🏆 <strong>{selectedUser.challenges_won}</strong> Wins</div>
              <div>❤️ <strong>{selectedUser.total_likes_received}</strong> Likes</div>
            </div>

            {/* Badges */}
            {selectedUser.badges.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-gray-700">🏅 Badges</h4>
                <div className="flex flex-wrap gap-3">
                  {selectedUser.badges.map((badge: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-200 px-2 py-1 rounded">
                      {badge.icon_url && (
                        <img
                          src={badge.icon_url}
                          alt={badge.name}
                          className="w-4 h-4"
                        />
                      )}
                      <span className="text-indigo-700 font-medium">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No badges earned yet.</p>
            )}
          </div>
          {selectedUser.username !== currentUser?.username && (
            <button
              onClick={selectedUser.is_following ? handleUnfollow : handleFollow}
              className={`px-4 py-1 rounded-full text-sm font-medium ${selectedUser.is_following
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
            >
              {selectedUser.is_following ? "Unfollow" : "Follow"}
            </button>
          )}
        </Modal>


      )}
    </div>
  );
};

export default GroupMemberList;
