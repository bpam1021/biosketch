import { useEffect, useState } from "react";
import {
    fetchAchievements,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    awardAchievement,
    searchUsers,
} from "../../api/adminApi";
import { toast } from "react-toastify";
import { Combobox } from "@headlessui/react";
import { Pencil, Trash2, Gift } from "lucide-react"; // Use lucide icons for aesthetics

const AchievementListPage = () => {
    const [achievements, setAchievements] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        icon_file: null as File | null,
        criteria_code: "",
    });
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const [userQuery, setUserQuery] = useState("");
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [selectedAchievementId, setSelectedAchievementId] = useState<number | "">("");

    useEffect(() => {
        loadAchievements();
    }, []);

    useEffect(() => {
        if (userQuery.length >= 2) {
            searchUsers(userQuery).then((res) => setUserSuggestions(res.data));
        } else {
            setUserSuggestions([]);
        }
    }, [userQuery]);

    const loadAchievements = async () => {
        try {
            const res = await fetchAchievements();
            setAchievements(res.data);
        } catch {
            toast.error("Failed to load achievements.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.criteria_code.trim()) {
            toast.warning("Name and Criteria Code are required.");
            return;
        }

        const data = new FormData();
        data.append("name", formData.name);
        data.append("description", formData.description);
        data.append("criteria_code", formData.criteria_code);
        if (formData.icon_file) data.append("icon", formData.icon_file);

        setLoading(true);
        try {
            if (editingId !== null) {
                await updateAchievement(editingId, data);
                toast.success("Achievement updated.");
            } else {
                await createAchievement(data);
                toast.success("Achievement created.");
            }

            setFormData({ name: "", description: "", icon_file: null, criteria_code: "" });
            setEditingId(null);
            loadAchievements();
        } catch {
            toast.error("Operation failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (achievement: any) => {
        setFormData({
            name: achievement.name,
            description: achievement.description,
            icon_file: null,
            criteria_code: achievement.criteria_code,
        });
        setEditingId(achievement.id);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this achievement?")) return;
        try {
            await deleteAchievement(id);
            toast.success("Achievement deleted.");
            loadAchievements();
        } catch {
            toast.error("Failed to delete achievement.");
        }
    };

    const handleAward = async () => {
        if (!selectedUser || !selectedAchievementId) {
            toast.warning("Please select a user and achievement.");
            return;
        }
        try {
            await awardAchievement(selectedUser.id, selectedAchievementId);
            toast.success("Achievement awarded.");
        } catch {
            toast.error("Failed to award achievement.");
        }
    };

    return (
        <div className="p-6 space-y-12 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800">🏆 Manage Achievements</h1>

            {/* Form */}
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-700">{editingId ? "Edit Achievement" : "Create New Achievement"}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                        type="text"
                        placeholder="Name"
                        className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Description"
                        className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="flex items-center gap-4">
                        <label
                            htmlFor="icon-upload"
                            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center"
                        >
                            📤 Upload Icon
                        </label>
                        <span className="text-sm text-gray-500">
                            {formData.icon_file ? formData.icon_file.name : "No file selected"}
                        </span>
                        <input
                            id="icon-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setFormData({ ...formData, icon_file: e.target.files?.[0] || null })}
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Criteria Code (e.g. total_posts > 10)"
                        className="col-span-1 sm:col-span-2 w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={formData.criteria_code}
                        onChange={(e) => setFormData({ ...formData, criteria_code: e.target.value })}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="col-span-1 sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                        {editingId ? "Update Achievement" : "Create Achievement"}
                    </button>
                </form>
            </div>

            {/* Achievement Table */}
            <div className="bg-white rounded-xl shadow-lg p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">All Achievements</h2>
                <table className="w-full text-sm table-auto border-collapse">
                    <thead className="bg-gray-100 text-left text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-3">Icon</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Code</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {achievements.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center text-gray-500 p-4 italic">No achievements found.</td>
                            </tr>
                        ) : (
                            achievements.map((ach) => (
                                <tr key={ach.id} className="border-t hover:bg-gray-50 transition-colors">
                                    <td className="p-3">
                                        {ach.icon_url ? (
                                            <img src={ach.icon_url} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="p-3">{ach.name}</td>
                                    <td className="p-3 text-xs text-gray-600">{ach.criteria_code}</td>
                                    <td className="p-3 text-center space-x-2">
                                        <button
                                            onClick={() => handleEdit(ach)}
                                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                        >
                                            <Pencil className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ach.id)}
                                            className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    🎖️ <span>Award Achievement</span>
                </h2>

                <div className="grid sm:grid-cols-3 gap-4">
                    {/* User Search Combobox */}
                    <Combobox value={selectedUser} onChange={setSelectedUser}>
                        <div className="relative">
                            <Combobox.Input
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Search user by name"
                                onChange={(e) => setUserQuery(e.target.value)}
                                displayValue={(user: any) => user?.username || ""}
                            />
                            {userSuggestions.length > 0 && (
                                <Combobox.Options className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                                    {userSuggestions.map((user) => (
                                        <Combobox.Option
                                            key={user.id}
                                            value={user}
                                            className={({ active }) =>
                                                `cursor-pointer px-4 py-2 ${active ? "bg-blue-100" : ""}`
                                            }
                                        >
                                            {user.username}
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Options>
                            )}
                        </div>
                    </Combobox>

                    {/* Achievement Selector */}
                    <select
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAchievementId}
                        onChange={(e) => setSelectedAchievementId(Number(e.target.value))}
                    >
                        <option value="">Select Achievement</option>
                        {achievements.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.name}
                            </option>
                        ))}
                    </select>

                    {/* Award Button */}
                    <button
                        onClick={handleAward}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex justify-center items-center gap-2 transition duration-150"
                    >
                        <Gift className="w-5 h-5" />
                        Award
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AchievementListPage;
