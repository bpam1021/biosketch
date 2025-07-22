import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useCredits } from "../context/CreditsContext";
import {
  FiLogOut,
  FiLogIn,
  FiUserPlus,
  FiCreditCard,
  FiUser,
  FiSettings,
  FiZap,
  FiMessageCircle,
} from "react-icons/fi";
import { getMyProfile } from "../api/profileApi";
import FeedbackModal from "./FeedbackModal";

function Navbar() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(localStorage.getItem("access_token"));
  const { credits } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const defaultName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username || ""
    : "";
  const defaultEmail = profile?.email || "";

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated) {
        try {
          const res = await getMyProfile();
          setProfile(res.data);
        } catch (err) {
          console.error("Failed to fetch profile", err);
        }
      }
    };
    fetchProfile();
  }, [isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-gray-900 text-white shadow-lg sticky top-0 z-50 transition-all">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Logo */}
        <div className="text-3xl font-extrabold tracking-tight">
          <Link to="/ImageGenerator" className="hover:text-blue-400 transition-colors">
            Biosketch <span className="text-blue-500">AI</span>
          </Link>
        </div>

        {/* Hamburger (mobile) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden flex items-center px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle menu"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>

        {/* Nav links */}
        <ul
          className={`lg:flex lg:items-center lg:space-x-4 absolute lg:static bg-gray-900 lg:bg-transparent w-full lg:w-auto left-0 transition-all duration-200 ease-in-out ${
            menuOpen
              ? "top-16 opacity-100 pointer-events-auto"
              : "top-[-9999px] opacity-0 pointer-events-none lg:opacity-100 lg:pointer-events-auto"
          }`}
        >
          {!isAuthenticated ? (
            <>
              <li>
                <Link
                  to="/register"
                  className="flex items-center gap-1 hover:text-blue-400 px-4 py-2 transition-colors font-medium"
                >
                  <FiUserPlus />
                  Register
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="flex items-center gap-1 hover:text-blue-400 px-4 py-2 transition-colors font-medium"
                >
                  <FiLogIn />
                  Login
                </Link>
              </li>
            </>
          ) : (
            <>
              {credits !== null && (
                <li className="flex items-center gap-2 px-4 py-2">
                  <FiZap className="text-yellow-300" />
                  <span>
                    <b>{credits}</b> Credits
                  </span>
                </li>
              )}
              {/* Profile dropdown */}
              <li className="relative">
                <button
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-4 py-2 hover:text-blue-400 transition-colors"
                >
                  {profile?.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-gray-400"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
                      {profile?.username?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <span className="hidden lg:inline font-semibold">
                    {profile?.username}
                  </span>
                </button>
                {profileDropdownOpen && (
                  <div ref={dropdownRef} className="absolute right-0 mt-2 w-52 bg-white text-gray-800 rounded-xl shadow-xl overflow-hidden z-50 border border-gray-200 animate-fadeIn">
                    <Link
                      to={`/profile/${profile?.username}`}
                      className="block px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FiUser /> View Profile
                    </Link>
                    <Link
                      to="/profile/edit"
                      className="block px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FiSettings /> Edit Profile
                    </Link>
                    <Link
                      to="/subscribe"
                      className="block px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FiCreditCard /> Buy Credits
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FiLogOut /> Logout
                    </button>
                  </div>
                )}
              </li>
            </>
          )}
          {/* Feedback Button - always visible */}
          <li className="my-2 lg:my-0">
            <button
              onClick={() => {
                setFeedbackOpen(true);
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition text-white font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <FiMessageCircle className="text-lg" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
          </li>
        </ul>
      </div>
      {/* Feedback Modal */}
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        defaultName={defaultName}
        defaultEmail={defaultEmail}
      />
    </nav>
  );
}

export default Navbar;
