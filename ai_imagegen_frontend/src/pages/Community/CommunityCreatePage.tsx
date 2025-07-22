import CommunityCreateForm from "../../components/Community/CommunityCreateForm";
import Sidebar from "../../components/Sidebar";
const CommunityCreatePage = () => {
  return (
    <div className="flex min-h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">📢 Create New Community</h1>
        <CommunityCreateForm />
      </div>
    </div>
  );
};

export default CommunityCreatePage;
