import { useEffect, useState } from "react";
import { fetchAllCommunities } from "../../api/adminApi";
import DataTable from "../../components/DataTable";
import { useNavigate } from "react-router-dom";

const CommunityListPage = () => {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("name");
    const [sortAsc, setSortAsc] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchCommunities = async () => {
            try {
                const res = await fetchAllCommunities();
                setCommunities(Array.isArray(res.data.results) ? res.data.results : []);
            } catch (err) {
                console.error("Failed to load communities", err);
            } finally {
                setLoading(false);
            }
        };

        fetchCommunities();
    }, []);

    const handleSort = (key: string) => {
        if (key === sortKey) {
            setSortAsc(!sortAsc);
        } else {
            setSortKey(key);
            setSortAsc(true);
        }
    };

    const sortedData = [...communities].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === "string") {
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortAsc ? aVal - bVal : bVal - aVal;
    });

    const columns = [
        {
            header: <button onClick={() => handleSort("name")}>
                Name {sortKey === "name" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: "name",
        },
        {
            header: <button onClick={() => handleSort("creator_username")}>
                Creator {sortKey === "creator_username" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: "creator_username",
        },
        {
            header: <button onClick={() => handleSort("privacy")}>
                Privacy {sortKey === "privacy" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: (row: any) => row.privacy === "private" ? "Private" : "Public",
        },
        {
            header: <button onClick={() => handleSort("member_count")}>
                Members {sortKey === "member_count" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: "member_count",
        },
        {
            header: <button onClick={() => handleSort("post_count")}>
                Posts {sortKey === "post_count" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: "post_count",
        },
        {
            header: <button onClick={() => handleSort("is_approved")}>
                Approved {sortKey === "is_approved" && (sortAsc ? "▲" : "▼")}
            </button>,
            accessor: (row: any) => row.is_approved ? "✅ Yes" : "❌ No",
        },
    ];


    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Community Groups</h1>
                <input
                    type="text"
                    placeholder="Search communities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1 text-sm w-64"
                />
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <DataTable
                    columns={columns}
                    data={sortedData}
                    rowKey={(row) => row.id}
                    searchTerm={search}
                    searchKeys={["name", "creator_username"]}
                    actions={(row) => (
                        <button
                            onClick={() => navigate(`/communities/${row.id}`)}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            View
                        </button>
                    )}
                />
            )}
        </div>
    );
};

export default CommunityListPage;
