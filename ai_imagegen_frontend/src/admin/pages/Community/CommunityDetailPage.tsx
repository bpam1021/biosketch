import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    fetchCommunityDetail,
    approveCommunity,
    banCommunity,
    deleteCommunity,
} from "../../api/adminApi";
import { toast } from "react-toastify";
import ConfirmActionModal from "../../components/Modals/ConfirmActionModal";

const CommunityDetailPage = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const [community, setCommunity] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmBan, setConfirmBan] = useState(false);

    const loadCommunity = async () => {
        try {
            const res = await fetchCommunityDetail(Number(groupId));
            setCommunity(res.data);
        } catch (err) {
            toast.error("Failed to fetch community details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCommunity();
    }, [groupId]);

    const handleApprove = async () => {
        try {
            await approveCommunity(Number(groupId));
            toast.success("Community approved.");
            setCommunity((prev: any) => ({ ...prev, is_approved: true }));
        } catch {
            toast.error("Failed to approve community.");
        }
    };

    const handleBan = async () => {
        try {
            await banCommunity(Number(groupId));
            toast.success("Community banned.");
            navigate("/communities");
        } catch {
            toast.error("Failed to ban community.");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteCommunity(Number(groupId));
            toast.success("Community deleted.");
            navigate("/communities");
        } catch {
            toast.error("Failed to delete community.");
        }
    };

    if (loading) return <p>Loading community...</p>;
    if (!community) return <p>Community not found.</p>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">{community.name}</h2>

            <div className="bg-white p-4 rounded shadow space-y-2">
                <p><b>Description:</b> {community.description}</p>
                <p><b>Creator:</b> @{community.creator_username}</p>
                <p><b>Privacy:</b> {community.privacy === "private" ? "Private" : "Public"}</p>
                <p><b>Approved:</b> {community.is_approved ? "Yes" : "No"}</p>
                <p><b>Members:</b> {community.members_count}</p>
                <p><b>Posts:</b> {community.posts_count}</p>
            </div>

            <div className="flex gap-3">
                {!community.is_approved && (
                    <button
                        onClick={handleApprove}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                        Approve
                    </button>
                )}
                <button
                    onClick={() => setConfirmBan(true)}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                >
                    Ban
                </button>
                <button
                    onClick={() => setConfirmDelete(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                    Delete
                </button>
            </div>

            <ConfirmActionModal
                isOpen={confirmBan}
                onCancel={() => setConfirmBan(false)}
                onConfirm={handleBan}
                title="Ban Community"
                message="Are you sure you want to ban this community? Members will lose access."
            />

            <ConfirmActionModal
                isOpen={confirmDelete}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
                title="Delete Community"
                message="Are you sure you want to permanently delete this community?"
            />

        </div>
    );
};

export default CommunityDetailPage;
