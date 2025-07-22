import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Auth/LoginPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import AdminRoutes from "./routes/AdminRoutes";
import DashboardHome from "./pages/DashboardHome";

export const App = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Admin Route wrapped in layout */}
      <Route path="/*" element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="*" element={<AdminRoutes />} />
      </Route>
    </Routes>
  );
};
