import { useEffect, useState } from 'react';
import { getDonationSummary } from '../../api/adminApi';

type Donation = {
    id: number;
    name: string;
    email: string;
    amount: number;
    date: string;
    user?: string;
};

export default function AdminDonationsPage() {
    const [summary, setSummary] = useState<{
        total_donations: number;
        weekly_total: number;
        count: number;
        recent: Donation[];
    } | null>(null);

    useEffect(() => {
        getDonationSummary().then(setSummary);
    }, []);

    if (!summary) return <div>Loading...</div>;

    return (
        <div className="space-y-6 p-6">
            <h2 className="text-2xl font-bold text-blue-800">Donation Dashboard</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded shadow">
                    <p className="text-sm text-gray-500">Total Donations</p>
                    <p className="text-xl font-semibold">${summary.total_donations.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded shadow">
                    <p className="text-sm text-gray-500">Past 7 Days</p>
                    <p className="text-xl font-semibold">${summary.weekly_total.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded shadow">
                    <p className="text-sm text-gray-500">Donation Count</p>
                    <p className="text-xl font-semibold">{summary.count}</p>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mt-6 mb-2">Recent Donations</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full table-auto text-left border rounded">
                        <thead className="bg-gray-100 text-sm text-gray-600">
                            <tr>
                                <th>User Type</th>
                                <th className="p-2">Name</th>
                                <th className="p-2">Email</th>
                                <th className="p-2">Amount</th>
                                <th className="p-2">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.recent.map((d) => (
                                <tr key={d.id} className="border-t text-sm">
                                    <td>{d.user ? 'Registered' : 'Guest'}</td>
                                    <td className="p-2">{d.name || 'Anonymous'}</td>
                                    <td className="p-2">{d.email}</td>
                                    <td className="p-2">${d.amount.toFixed(2)}</td>
                                    <td className="p-2">{new Date(d.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
