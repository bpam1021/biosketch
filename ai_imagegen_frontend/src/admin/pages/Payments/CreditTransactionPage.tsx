import { useEffect, useState } from "react";
import {
    getCreditSummary,
    fetchUserTransactions,
} from "../../api/adminApi";
import DataTable from "../../components/DataTable";
import CreditDetailModal from "../../components/Modals/CreditDetailModal";

type SummaryRow = {
    user_id: number;
    username: string;
    total_recharge: number;
    total_usage: number;
    credits: number;
};

type TransactionRow = {
    id: number;
    username: string;
    amount: number;
    type: string;
    timestamp: string;
    description: string;
};

const CreditTransactionPage = () => {
    const [summary, setSummary] = useState<SummaryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<SummaryRow | null>(null);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await getCreditSummary();
                setSummary(res.data);
            } catch (err) {
                console.error("Failed to load credit summary", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, []);

    const openDetailModal = async (user: SummaryRow) => {
        setSelectedUser(user);
        setLoadingDetail(true);
        try {
            const res = await fetchUserTransactions(user.user_id);
            const formatted = res.data.map((t: any) => ({
                id: t.id,
                username: t.user_username,
                amount: t.amount,
                type: t.type,
                timestamp: new Date(t.timestamp).toLocaleString(),
                description: t.description,
            }));
            setTransactions(formatted);
        } catch (err) {
            console.error("Failed to load transactions", err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeModal = () => {
        setSelectedUser(null);
        setTransactions([]);
    };

    const columns: { header: string; accessor: keyof SummaryRow }[] = [
        { header: "User", accessor: "username" },
        { header: "Total Recharge", accessor: "total_recharge" },
        { header: "Total Usage", accessor: "total_usage" },
        { header: "Remaining Credits", accessor: "credits" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Credit Summary</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <DataTable
                    columns={columns}
                    data={summary}
                    rowKey={(row) => row.user_id}
                    actions={(row) => (
                        <button
                            onClick={() => openDetailModal(row)}
                            className="text-blue-500 underline"
                        >
                            View Details
                        </button>
                    )}
                />
            )}

            {selectedUser && (
                <CreditDetailModal onClose={closeModal} title={`Transactions: ${selectedUser.username}`}>
                    {loadingDetail ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-transparent" />
                            <span className="ml-3 text-gray-600">Loading transactions...</span>
                        </div>
                    ) : (
                        <div className="overflow-y-auto max-h-[60vh]">
                            <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Amount</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
                                        <th className="px-4 py-3 font-semibold text-gray-700">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-2 text-gray-800 whitespace-nowrap">{t.timestamp}</td>
                                            <td className="px-4 py-2 text-green-600 font-medium">${t.amount.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-gray-700 capitalize">{t.type}</td>
                                            <td className="px-4 py-2 text-gray-600">{t.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CreditDetailModal>
            )}
        </div>
    );
};

export default CreditTransactionPage;
