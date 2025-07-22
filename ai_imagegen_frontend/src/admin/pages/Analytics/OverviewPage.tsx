import { useEffect, useState } from "react";
import { fetchPlatformStats, fetchChallengeAnalytics, fetchLeaderboardStats } from "../../api/adminApi";
import StatCard from "../../components/StatCard";
import { toast } from "react-toastify";

const OverviewPage = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_users: 0,
        total_images: 0,
        total_posts: 0,
        total_comments: 0,
    });
    const [leaderboard, setLeaderboard] = useState([]);
    const [challengePerformance, setChallengePerformance] = useState<any>({});

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [platformRes, leaderboardRes, challengeRes] = await Promise.all([
                    fetchPlatformStats(),
                    fetchLeaderboardStats(),
                    fetchChallengeAnalytics(),
                ]);

                setStats({
                    total_users: platformRes.data.total_users,
                    total_images: platformRes.data.total_generated_images,
                    total_posts: platformRes.data.total_community_posts,
                    total_comments: platformRes.data.total_community_comments,
                });
                setLeaderboard(Array.isArray(leaderboardRes.data.top_creators) ? leaderboardRes.data.top_creators : []);
                setChallengePerformance(challengeRes.data);
            } catch (err) {
                toast.error("Failed to fetch analytics");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <p className="p-4">Loading analytics...</p>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">📊 Platform Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Users" value={stats.total_users} icon="👤" />
                <StatCard title="Images" value={stats.total_images} icon="🖼️" />
                <StatCard title="Posts" value={stats.total_posts} icon="📝" />
                <StatCard title="Comments" value={stats.total_comments} icon="💬" />
            </div>

            <div className="bg-white p-4 rounded shadow mb-6">
                <h3 className="text-lg font-semibold mb-2">🏆 Leaderboard Top Users</h3>
                <ul className="text-sm space-y-1">
                    {leaderboard.map((user: any, i: number) => (
                        <li key={user.user__username}>
                            {i + 1}. <strong>{user.user__username}</strong> – {user.total_images_generated} images generated, {user.total_images_published} images published, {user.total_likes_received} likes, {user.challenges_won} wins
                        </li>
                    ))}

                </ul>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">📈 Challenge Performance</h3>
                <ul className="text-sm space-y-1">
                    <li><strong>Total Challenges:</strong> {challengePerformance.total_challenges}</li>
                    <li><strong>Active Challenges:</strong> {challengePerformance.active_challenges}</li>
                    <li><strong>Completed Challenges:</strong> {challengePerformance.completed_challenges}</li>
                    <li><strong>Total Entries:</strong> {challengePerformance.total_entries}</li>
                </ul>
            </div>
        </div>
    );
};

export default OverviewPage;
