import { useAdminAuth } from "../context/AdminAuthContext";
import { FiLogOut, FiUser } from "react-icons/fi";

const Header = () => {
  const { logout } = useAdminAuth();

  return (
    <header className="bg-white border-b shadow-sm px-6 py-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">Biosketch AI Admin Dashboard</h1>

      <div className="flex items-center space-x-4">
        {/* Placeholder Admin Info (customize if needed) */}
        <div className="flex items-center space-x-2 text-gray-700">
          <FiUser />
          <span className="text-sm font-medium">Admin</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center space-x-1 text-red-600 text-sm font-medium hover:underline"
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
