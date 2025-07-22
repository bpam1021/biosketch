import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import ChatPanel from "../../components/Community/ChatPanel";
import {
  getCommunityDetail,
  joinCommunity,
  leaveCommunity,
  getMyCommunities,
  getCommunityPosts
} from "../../api/communityApi";
import GroupHeader from "../../components/Community/GroupHeader";
import CommunityPostList from "../../components/Community/CommunityPostList";
import CommunityPostForm from "../../components/Community/CommunityPostForm";
import { CommunityPost } from "../../types/CommunityTypes";
import GroupMemberList from "../../components/Community/GroupMemberList";
import InviteMemberForm from "../../components/Community/InviteMemberForm";
import { CommunityGroup } from "../../types/CommunityTypes";
import { useAuth } from "../../context/AuthContext";
import DOMPurify from "dompurify";
import Sidebar from "../../components/Sidebar";

const CommunityDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [isMember, setIsMember] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async () => {
    if (!group || !hasMore) return;
    try {
      const res = await getCommunityPosts(group.id, page);
      const newPosts: CommunityPost[] = res.data.results || res.data;

      if (newPosts.length === 0) {
        setHasMore(false);
        return;
      }

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(p.id));
        return page === 1 ? newPosts : [...prev, ...uniqueNewPosts];
      });

      if (!res.data.next) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to fetch posts", err);
      setHasMore(false);
    }
  };

  useEffect(() => {
    if (group) fetchPosts();
  }, [group, page]);

  const fetchGroup = async () => {
    if (!groupId) return;
    try {
      const res = await getCommunityDetail(Number(groupId));
      setGroup(res.data);
    } catch (err) {
      console.error("❌ Failed to load community", err);
      toast.error("Community not found.");
      navigate("/community");
    }
  };

  const checkMembership = async () => {
    try {
      const myRes = await getMyCommunities();
      const myGroups: CommunityGroup[] = Array.isArray(myRes.data) ? myRes.data : myRes.data.results || [];
      const found = myGroups.find((g) => g.id === Number(groupId));
      setIsMember(!!found);
    } catch (err) {
      console.error("❌ Membership check failed", err);
    }
  };

  const handleJoin = async () => {
    if (group) setShowConfirmModal(true);
  };

  const confirmJoin = async () => {
    try {
      await joinCommunity(group!.id);
      toast.success(`✅ Joined "${group!.name}"`);
      setShowConfirmModal(false);
      await checkMembership();
    } catch (err) {
      toast.error("❌ Failed to join group");
    }
  };

  const handleLeave = async () => {
    try {
      await leaveCommunity(group!.id);
      toast.info(`🚪 Left "${group!.name}"`);
      await checkMembership();
    } catch (err) {
      toast.error("❌ Failed to leave group");
    }
  };

  useEffect(() => {
    fetchGroup();
    checkMembership();
  }, [groupId]);

  if (!group) return <p className="p-6 text-gray-600">Loading community...</p>;

  const isPrivate = group.privacy === "private";
  const isCreator = currentUser?.username === group.creator_username;
  const isBanned = group.is_banned;
  const isDeleted = group.is_deleted;
  const isApproved = group.is_approved;

  // 🚫 Hard blocks
  if (isBanned) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-red-700 font-semibold">
        🚫 This community has been banned.
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-gray-600 italic">
        🗑️ This community has been removed.
      </div>
    );
  }

  if (!isApproved && !isCreator) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-yellow-600">
        ⏳ This community is awaiting approval and is not yet publicly accessible.
      </div>
    );
  }

  const cannotAccessContent = !isMember && !isCreator;

  return (
    <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
      <div className="flex-1 px-4 py-6 max-w-7xl mx-auto">
        <GroupHeader
          group={group}
          isMember={isMember}
          onJoin={handleJoin}
          onLeave={handleLeave}
          currentUser={currentUser}
        />

        {!isApproved && isCreator && (
          <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-800 text-sm px-4 py-2 rounded">
            🕒 Your community is pending admin approval. Only you can see this page for now.
          </div>
        )}

        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow max-w-lg w-full">
              <h3 className="text-xl font-bold mb-4">📜 Community Rules</h3>
              <div
                className="prose max-h-64 overflow-y-auto p-3 rounded bg-gray-50"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(group.compliance_rules || "No rules provided."),
                }}
              />
              <div className="flex justify-end mt-4 gap-2">
                <button
                  className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={confirmJoin}
                >
                  I Agree & Join
                </button>
              </div>
            </div>
          </div>
        )}

        {cannotAccessContent ? (
          <div className="text-center text-red-600 mt-6 font-medium">
            🚫 You must join this community to view posts and members.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              <CommunityPostForm groupId={group.id} onPostSuccess={(newPost) => {
                setPosts((prev) => [newPost, ...prev]);
              }} />
              <CommunityPostList posts={posts} refreshPosts={fetchPosts} />
              {hasMore && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => setPage((prev) => prev + 1)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <ChatPanel roomName={`community-${group.id}`} userId={Number(currentUser?.id) || 0} />
              <GroupMemberList groupId={group.id} />
              {isCreator && isPrivate && <InviteMemberForm groupId={group.id} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDetailPage;
