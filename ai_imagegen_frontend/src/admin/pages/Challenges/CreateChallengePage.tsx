import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createChallenge } from "../../api/adminApi";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

const CreateChallengePage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await createChallenge(form);
            toast.success("✅ Challenge created successfully");
            navigate("/challenges");
        } catch (err) {
            console.error("Failed to create challenge", err);
            toast.error("❌ Failed to create challenge");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className=" bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-10">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    📅 Create New Challenge
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Weekend Photo Contest"
                            className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            required
                            placeholder="Describe the theme, rules, or goals of the challenge."
                            rows={5}
                            className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Date Fields */}

                    <div>
                        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                            Start Date & Time
                        </label>
                        <input
                            id="start_date"
                            type="datetime-local"
                            name="start_date"
                            value={form.start_date}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                            End Date & Time
                        </label>
                        <input
                            id="end_date"
                            type="datetime-local"
                            name="end_date"
                            value={form.end_date}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-lg border border-gray-300 shadow-sm p-3 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-60"
                        >
                            {submitting && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
                            {submitting ? "Creating..." : "Create Challenge"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChallengePage;
