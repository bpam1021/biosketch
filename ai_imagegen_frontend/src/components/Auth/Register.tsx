import { useState, useEffect, useCallback, ChangeEvent, FocusEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { checkEmail, checkUsername } from "../../api/authApi";
import debounce from "lodash.debounce";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const [isEmailTaken, setIsEmailTaken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, message: "" });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "username") debouncedCheckUsername(value);
    else if (name === "email") debouncedCheckEmail(value);
  };

  const debouncedCheckUsername = useCallback(
    debounce(async (username: string) => {
      try {
        const res = await checkUsername(username);
        setIsUsernameTaken(res.data.isTaken);
      } catch {
        setIsUsernameTaken(false);
      }
    }, 500),
    []
  );
  
  const debouncedCheckEmail = useCallback(
    debounce(async (email: string) => {
      try {
        const res = await checkEmail(email);
        setIsEmailTaken(res.data.isTaken);
      } catch {
        setIsEmailTaken(false);
      }
    }, 500),
    []
  );

  const validatePasswordStrength = (password: string) => {
    const checks = [
      { label: "At least 8 characters", regex: /.{8,}/ },
      { label: "Uppercase letter", regex: /[A-Z]/ },
      { label: "Lowercase letter", regex: /[a-z]/ },
      { label: "Number", regex: /\d/ },
      { label: "Special character", regex: /[!@#$%^&*(),.?":{}|<>]/ },
    ];

    const failed = checks.filter(check => !check.regex.test(password));
    const msg = failed.map(f => `- ${f.label}`).join("\n");

    setPasswordStrength({
      isValid: failed.length === 0,
      message: failed.length === 0 ? "Password is strong!" : msg,
    });
  };

  useEffect(() => {
    if (formData.password) validatePasswordStrength(formData.password);
    return () => {
      debouncedCheckUsername.cancel();
      debouncedCheckEmail.cancel();
    };
  }, [formData.password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isUsernameTaken || isEmailTaken) {
      toast.error("Username or email already taken.");
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error("Password doesn't meet requirements.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(formData.username, formData.email, formData.password);
      toast.success("Account created!");
      navigate("/login");
    } catch (err) {
      toast.error("Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <div className="flex items-center justify-center mb-6">
          <img
            src="/Logo.png"
            alt="Biosketch AI Logo"
            className="h-36 w-auto object-contain"
          />
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-700 mb-6">Create an Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring focus:ring-gray-500"
            />
            {isUsernameTaken && <p className="text-red-500 text-sm mt-1">Username already taken.</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring focus:ring-gray-500"
            />
            {isEmailTaken && <p className="text-red-500 text-sm mt-1">Email already taken.</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring focus:ring-gray-500"
            />
            <div className="mt-2">
              {passwordStrength.message && (
                <ul className="text-sm text-gray-600 whitespace-pre-wrap">
                  {passwordStrength.message.split("\n").map((msg, idx) => (
                    <li key={idx}>
                      <span className={`mr-2 ${passwordStrength.isValid ? "text-green-500" : "text-red-500"}`}>
                        {passwordStrength.isValid ? "✔️" : "❌"}
                      </span>
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
