import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiTrash2, FiEdit3, FiGrid, FiImage } from 'react-icons/fi';
import {
    fetchTemplateCategories,
    createTemplateCategory,
    updateTemplateCategory,
    deleteTemplateCategory,
    fetchTemplateImages,
    createTemplateImage,
    updateTemplateImage,
    deleteTemplateImage,
} from '../../api/adminApi';

interface TemplateCategory {
    id: number;
    name: string;
    description: string;
}

interface TemplateImage {
    id: number;
    name: string;
    image: string;
    category: number;
    type: string;
}

const AdminTemplateManagerPage = () => {
    const [tab, setTab] = useState<'categories' | 'images'>('categories');
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [images, setImages] = useState<TemplateImage[]>([]);
    const [form, setForm] = useState<any>({});
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [imageTypeFilter, setImageTypeFilter] = useState<string>('');

    useEffect(() => {
        fetchCategories();
        fetchImages();
    }, []);

    useEffect(() => {
        if (tab === 'images') {
            fetchImages();
            setImageTypeFilter('');
        }
    }, [tab]);

    const fetchCategories = async () => {
        try {
            const res = await fetchTemplateCategories();
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setCategories(data);
        } catch {
            toast.error('Failed to fetch categories');
        }
    };

    const fetchImages = async () => {
        try {
            const res = await fetchTemplateImages();
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setImages(data);
        } catch {
            toast.error('Failed to fetch images');
        }
    };

    const handleSubmit = async () => {
        try {
            if (tab === 'categories') {
                if (isEdit && editId !== null) {
                    await updateTemplateCategory(editId, form);
                } else {
                    await createTemplateCategory(form);
                }
                fetchCategories();
                toast.success(`Category ${isEdit ? 'updated' : 'created'}`);
            } else {
                const formData = new FormData();
                formData.append('name', form.name);
                formData.append('category', form.category);
                formData.append('type', form.type || '2d');
                if (form.image instanceof File) {
                    formData.append('image', form.image);
                }
                if (isEdit && editId !== null) {
                    await updateTemplateImage(editId, formData);
                } else {
                    await createTemplateImage(formData);
                }
                fetchImages();
                toast.success(`Image ${isEdit ? 'updated' : 'uploaded'}`);
            }
            setForm({});
            setIsEdit(false);
            setEditId(null);
        } catch {
            toast.error('Submission failed');
        }
    };

    const handleDelete = async (type: 'category' | 'image', id: number) => {
        try {
            if (type === 'category') {
                await deleteTemplateCategory(id);
                fetchCategories();
            } else {
                await deleteTemplateImage(id);
                fetchImages();
            }
            toast.success(`${type === 'category' ? 'Category' : 'Image'} deleted`);
        } catch {
            toast.error('Delete failed');
        }
    };

    const handleEdit = (item: any, type: 'category' | 'image') => {
        setForm(item);
        setIsEdit(true);
        setEditId(item.id);
        setTab(type === 'category' ? 'categories' : 'images');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Template Manager</h2>

            {/* Tabs */}
            <div className="flex justify-center mb-10">
                <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-inner">
                    <button
                        onClick={() => setTab('categories')}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${tab === 'categories' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        <FiGrid className="text-lg" /> Categories
                    </button>
                    <button
                        onClick={() => setTab('images')}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${tab === 'images' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-200'}`}
                    >
                        <FiImage className="text-lg" /> Images
                    </button>
                </div>
            </div>

            {tab === 'categories' ? (
                <div>
                    {/* Category Form */}
                    <div className="bg-white shadow rounded-lg p-6 mb-10 space-y-6 max-w-2xl mx-auto">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Category Name</label>
                            <input
                                type="text"
                                value={form.name || ''}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter category name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Description</label>
                            <textarea
                                value={form.description || ''}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                placeholder="Description..."
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={handleSubmit}
                                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                {isEdit ? 'Update Category' : 'Add Category'}
                            </button>
                        </div>
                    </div>

                    {/* Category Table */}
                    <div className="overflow-x-auto bg-white shadow rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Description</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="border-t hover:bg-gray-50">
                                        <td className="px-4 py-3">{cat.name}</td>
                                        <td className="px-4 py-3">{cat.description}</td>
                                        <td className="px-4 py-3 text-center space-x-2">
                                            <button onClick={() => handleEdit(cat, 'category')} className="text-blue-600 hover:text-blue-800"><FiEdit3 /></button>
                                            <button onClick={() => handleDelete('category', cat.id)} className="text-red-600 hover:text-red-800"><FiTrash2 /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Image Form */}
                    <div className="bg-white shadow rounded-lg p-6 mb-10 space-y-6 max-w-2xl mx-auto">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Image Name</label>
                            <input
                                type="text"
                                value={form.name || ''}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter image name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Category</label>
                            <select
                                value={form.category || ''}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Template Type</label>
                            <select
                                value={form.type || '2d'}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="2d">2D</option>
                                <option value="3d">3D</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Upload Image</label>
                            <input
                                type="file"
                                onChange={(e) => setForm({ ...form, image: e.target.files?.[0] })}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="pt-2">
                            <button
                                onClick={handleSubmit}
                                className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                {isEdit ? 'Update Image' : 'Upload Image'}
                            </button>
                        </div>
                    </div>

                    {/* Image Filter */}
                    <div className="mb-6 flex justify-end">
                        <label className="mr-2 font-medium">Filter by Type:</label>
                        <select
                            value={imageTypeFilter}
                            onChange={(e) => setImageTypeFilter(e.target.value)}
                            className="px-3 py-1 border rounded-md bg-white"
                        >
                            <option value="">All</option>
                            <option value="2d">2D</option>
                            <option value="3d">3D</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                        {images
                            .filter(img => !imageTypeFilter || img.type === imageTypeFilter)
                            .map((img) => (
                                <div key={img.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                                    <img src={img.image} alt={img.name} className="w-full h-32 object-cover" />
                                    <div className="p-3 text-center">
                                        <p className="font-medium text-sm">{img.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{img.type.toUpperCase()}</p>
                                        <div className="flex justify-center gap-3 mt-2">
                                            <button onClick={() => handleEdit(img, 'image')} className="text-blue-600 hover:text-blue-800"><FiEdit3 /></button>
                                            <button onClick={() => handleDelete('image', img.id)} className="text-red-600 hover:text-red-800"><FiTrash2 /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTemplateManagerPage;
