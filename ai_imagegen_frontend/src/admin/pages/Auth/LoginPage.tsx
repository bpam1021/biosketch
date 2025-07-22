import { useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";

const LoginPage = () => {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(username, password);
  };

  return (
    <div className=" flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black px-4 min-h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6"
      >
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 text-center">Admin Panel</h2>
          <p className="text-sm text-gray-500 text-center mt-1">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            required
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
        >
          Sign In
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
