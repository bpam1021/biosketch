import { NavLink } from "react-router-dom";
import { FiHome, FiUsers, FiLayers, FiFileText, FiList, FiBarChart2, FiSettings, FiDollarSign, FiAward, FiLayout, FiCalendar, FiMessageCircle } from "react-icons/fi";

const navItems = [
  { label: "Dashboard", path: "/", icon: <FiHome /> },
  { label: "Users", path: "/users", icon: <FiUsers /> },
  { label: "Communities", path: "/communities", icon: <FiLayers /> },
  { label: "Posts", path: "/posts", icon: <FiFileText /> },
  { label: "Comments", path: "/comments", icon: <FiList /> },
  { label: "Challenges", path: "/challenges", icon: <FiBarChart2 /> },
  { label: "Achievements", path: "/achievements", icon: <FiAward /> },
  { label: "Payments", path: "/payments", icon: <FiDollarSign /> },
  { label: "Analytics", path: "/analytics", icon: <FiBarChart2 /> },
  { label: "Settings", path: "/settings", icon: <FiSettings /> },
  { label: "Template Manager", path: "/template-manager", icon: <FiLayout /> },
  { label: "Template Requests", path: "/template-requests", icon: <FiCalendar /> },
  { label: "Feedback", path: "/feedback", icon: <FiMessageCircle /> },
];

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white shadow-md h-screen sticky top-0 z-20">
      <div className="px-6 py-4 text-xl font-bold border-b text-blue-700">Admin Panel</div>
      <nav className="flex flex-col mt-4 space-y-1 px-4">
        {navItems.map(({ label, path, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-blue-100 transition ${
                isActive ? "bg-blue-50 text-blue-600 font-semibold" : "text-gray-700"
              }`
            }
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
