import { useEffect, useState } from 'react';
import { getMyProfile, updateUserProfile } from '../../api/profileApi';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';

const EditUserProfilePage = () => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    phone_number: '',
    profile_visibility: 'public',
  });

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        const data = res.data;
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          bio: data.bio || '',
          phone_number: data.phone_number || '',
          profile_visibility: data.profile_visibility || 'public',
        });
        setProfilePicturePreview(data.profile_picture || null);
        setUsername(data.username);
      } catch (err) {
        toast.error('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (profilePictureFile) {
        data.append('profile_picture', profilePictureFile);
      }

      await updateUserProfile(data);
      toast.success('✅ Profile updated!');
      navigate(`/profile/${username}`);
    } catch (err) {
      toast.error('❌ Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-4xl mx-auto p-8 bg-white shadow-xl rounded-2xl mt-10 mb-10">
        <h2 className="text-3xl font-bold mb-8 text-center text-indigo-700">✏️ Edit Your Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          <div className="text-center">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Profile Picture</label>
            <div className="flex justify-center items-center gap-6">
              {profilePicturePreview ? (
                <img
                  src={profilePicturePreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover border shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No image
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm file:bg-indigo-600 file:text-white file:px-4 file:py-2 file:rounded-md hover:file:bg-indigo-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profile Visibility</label>
            <select
              name="profile_visibility"
              value={form.profile_visibility}
              onChange={handleChange}
              className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditUserProfilePage;
