import { useEffect, useState } from "react";
import { fetchSystemSettings, updateSystemSettings } from "../../api/adminApi";
import { toast } from "react-toastify";

const SystemSettingsPage = () => {
  const [form, setForm] = useState({
    openai_api_key: "",
    gemini_api_key: "",
    stripe_secret_key: "",
    stripe_publishable_key: "",
    allowed_models: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetchSystemSettings();
        setForm(res.data);
      } catch (err) {
        toast.error("Failed to load system settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSystemSettings(form);
      toast.success("Settings updated successfully");
    } catch (err) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-4">Loading system settings...</p>;

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">System Configuration</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">OpenAI API Key</label>
          <input
            type="text"
            name="openai_api_key"
            value={form.openai_api_key}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Gemini API Key</label>
          <input
            type="text"
            name="gemini_api_key"
            value={form.gemini_api_key}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Stripe Secret Key</label>
          <input
            type="text"
            name="stripe_secret_key"
            value={form.stripe_secret_key}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Stripe Publishable Key</label>
          <input
            type="text"
            name="stripe_publishable_key"
            value={form.stripe_publishable_key}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium">Allowed Models</label>
          <textarea
            name="allowed_models"
            value={form.allowed_models}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            rows={3}
            placeholder="e.g. gpt-4, gemini-pro"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default SystemSettingsPage;
