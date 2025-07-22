import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../constants/constants";

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    setIsAdminAuthenticated(!!token);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await axios.post(`${API_BASE}/admin-api/login/`, { username, password });
      const token = res.data.token;
      localStorage.setItem("admin_token", token);
      setIsAdminAuthenticated(true);
      navigate("/");
    } catch (err) {
      console.error("Admin login failed", err);
      alert("Login failed. Please check your credentials.");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setIsAdminAuthenticated(false);
    navigate("/login");
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return context;
};
