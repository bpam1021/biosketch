import { useState } from "react";
import {
  FiImage,
  FiEdit,
  FiUsers,
  FiMenu,
  FiZap,
  FiAirplay,
  FiBarChart,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const location = useLocation();

  const menuItems = [
    { icon: <FiImage size={24} />, label: "Text to Image", path: "/ImageGenerator" },
    { icon: <FiAirplay size={24} />, label: "Presentation", path: "/presentation" },
    { icon: <FiBarChart size={24} />, label: "RNA-seq Analysis", path: "/rnaseq" },
    { icon: <FiEdit size={24} />, label: "Edit", path: "/ImageEdit" },
    { icon: <FiUsers size={24} />, label: "Community", path: "/community" },
    { icon: <FiZap size={24} />, label: "Challenge", path: "/challenges" },
    // { icon: <FiAward size={24} />, label: "Leaderboard", path: "/leaderboard" },
    // { icon: <FiBookOpen size={24} />, label: "About us", path: "/About-us" },
  ];

  return (
    <motion.div
      className={`${
        expanded ? "w-48" : "w-20"
      } bg-gray-900 text-white flex flex-col py-4 transition-all duration-300 shadow-lg min-h-screen`}
      initial={{ width: 60 }}
      animate={{ width: expanded ? 192 : 60 }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-6 text-gray-300 hover:text-white transition-all duration-200 flex items-center px-4"
      >
        <FiMenu size={24} />
        {expanded && <span className="ml-4 text-sm font-semibold">Menu</span>}
      </button>

      {menuItems.map(({ icon, label, path }) => (
        <motion.div key={path} whileHover={{ scale: 1.05 }}>
          <Link
            to={path}
            className={`relative flex items-center px-4 py-3 rounded-lg transition-all duration-300 hover:bg-gray-700 ${
              location.pathname === path ? "bg-gray-800" : ""
            }`}
            onMouseEnter={() => setHoveredItem(path)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {icon}
            {expanded && <span className="ml-4 text-sm font-medium">{label}</span>}
            {!expanded && hoveredItem === path && (
              <motion.div
                className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-md"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                {label}
              </motion.div>
            )}
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default Sidebar;
