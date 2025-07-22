import { useEffect, useState } from "react";
import {
    fetchPlatformStats,
    fetchUserGrowth,
    fetchImageTrends,
    fetchCreditBreakdown,
    fetchCreditUserTrends,
} from "../api/adminApi";
import StatCard from "../components/StatCard";
import {
    Users,
    Image,
    MessageCircle,
    ShieldCheck,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
} from "recharts";

const DashboardHome = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [granularity, setGranularity] = useState("month");
    const [userGrowth, setUserGrowth] = useState([]);
    const [imageTrends, setImageTrends] = useState([]);
    const [creditBreakdown, setCreditBreakdown] = useState({
        free_users: 0,
        credit_users: 0,
    });
    const [creditUserTrend, setCreditUserTrend] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [
                    statsRes,
                    growthRes,
                    imageRes,
                    creditRes,
                    creditTrendRes,
                ] = await Promise.all([
                    fetchPlatformStats(),
                    fetchUserGrowth(granularity),
                    fetchImageTrends(granularity),
                    fetchCreditBreakdown(),
                    fetchCreditUserTrends(granularity),
                ]);

                setStats(statsRes.data);
                setUserGrowth(growthRes.data);
                setImageTrends(imageRes.data);
                setCreditBreakdown(creditRes.data);
                setCreditUserTrend(creditTrendRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [granularity]);

    const ChartSection = ({ title, data, dataKey, stroke }: any) => (
        <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </section>
    );
    
    if (loading) return <p className="p-6 text-gray-600">Loading dashboard...</p>;
    if (!stats) return <p className="p-6 text-red-500">Failed to load dashboard stats.</p>;

    return (
        <div className="p-6 space-y-12">
            {/* Header and Granularity Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-800">📊 Admin Dashboard</h1>
                <select
                    value={granularity}
                    onChange={(e) => setGranularity(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    {["day", "week", "month", "year"].map((g) => (
                        <option key={g} value={g}>
                            {g.charAt(0).toUpperCase() + g.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.total_users} icon={<Users />} description="All registered users" />
                <StatCard title="New This Week" value={stats.new_users_this_week} icon={<ShieldCheck />} description="Recently joined users" />
                <StatCard title="Active This Week" value={stats.active_users_this_week} icon={<MessageCircle />} description="Users who posted or generated" />
                <StatCard title="Generated Images" value={stats.total_generated_images} icon={<Image />} description="All AI images created" />
                <StatCard title="New Images This Week" value={stats.new_images_this_week} icon={<Image />} description="Recent image activity" />
                <StatCard title="Community Posts" value={stats.total_community_posts} icon={<MessageCircle />} />
                <StatCard title="Community Groups" value={stats.total_community_groups} icon={<Users />} />
            </div>

            {/* Charts */}
            <ChartSection
                title={`📈 User Growth (${granularity})`}
                data={userGrowth}
                dataKey="count"
                stroke="#6366f1"
            />

            <ChartSection
                title={`🖼️ Image Generation Trend (${granularity})`}
                data={imageTrends}
                dataKey="count"
                stroke="#10b981"
            />

            <ChartSection
                title={`💳 Credit Users Trend (${granularity})`}
                data={creditUserTrend}
                dataKey="credit_user_count"
                stroke="#f59e0b"
            />

            {/* Bar Chart */}
            <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">🧾 Current Plan Distribution</h2>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                        data={[
                            { label: "Free Users", value: creditBreakdown.free_users },
                            { label: "Credit Users", value: creditBreakdown.credit_users },
                        ]}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </section>
        </div>
    );
};

export default DashboardHome;
