import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout(); // Clear tokens / auth state
    toast.success("You have been logged out.");
    navigate("/login");
  }, [logout, navigate]);

  return null;
};

export default Logout;
