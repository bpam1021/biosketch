import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { lazy, Suspense } from 'react';
import 'react-quill/dist/quill.snow.css';
import { createCommunity } from '../../api/communityApi';

const ReactQuill = lazy(() => import('react-quill'));

const CommunityCreateForm = () => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    compliance_rules: '',
    privacy: 'public',
    group_image: null as File | null,
  });

  const [preview, ] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const MAX_WIDTH = 512;
  const MAX_HEIGHT = 512;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      if (img.width > MAX_WIDTH || img.height > MAX_HEIGHT) {
        toast.error(`Image must be at most ${MAX_WIDTH}x${MAX_HEIGHT} pixels`);
        return;
      }
      setForm((prev) => ({ ...prev, group_image: file }));
    };

    img.onerror = () => {
      toast.error("Invalid image file");
    };
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('description', form.description);
      data.append('compliance_rules', form.compliance_rules);
      data.append('privacy', form.privacy);
      if (form.group_image) data.append('group_image', form.group_image);

      await createCommunity(data);

      toast.success('🎉 Community created!');
      navigate('/community'); // Navigate after success
    } catch (err) {
      console.error(err);
      toast.error('Failed to create community');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-xl space-y-6 max-w-3xl mx-auto"
    >
      <h2 className="text-3xl font-bold text-gray-800">🆕 Create a Community</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Community Name</label>
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 p-3 rounded-md"
          placeholder="Enter community name"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Short Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-300 p-3 rounded-md"
          placeholder="What's this community about?"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Community Rules (visible before joining)
        </label>
        <Suspense fallback={<div>Loading editor...</div>}>
          <ReactQuill
            value={form.compliance_rules}
            onChange={(val: string) => setForm((prev) => ({ ...prev, compliance_rules: val }))}
            theme="snow"
          />
        </Suspense>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Privacy</label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="privacy"
              value="public"
              checked={form.privacy === 'public'}
              onChange={handleChange}
            />
            Public
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="privacy"
              value="private"
              checked={form.privacy === 'private'}
              onChange={handleChange}
            />
            Private
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Community Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block text-sm text-gray-600"
        />
        {preview && (
          <img src={preview} alt="Preview" className="mt-2 h-32 object-cover rounded-md" />
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition"
      >
        {submitting ? 'Creating...' : 'Create Community'}
      </button>
    </form>
  );
};

export default CommunityCreateForm;
