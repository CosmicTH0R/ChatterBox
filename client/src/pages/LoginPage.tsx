import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  MessageSquareText,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // ✅ Use environment variable
  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToastId = toast.loading("Logging in...");

    try {
      // ✅ Dynamic API URL
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("userId", res.data.userId);

      toast.success("Login successful!", { id: loadingToastId });
      navigate("/lobby");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials", {
        id: loadingToastId,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-md w-full">
        <div className="flex justify-center items-center space-x-2 mb-8">
          <MessageSquareText className="w-10 h-10 text-indigo-600" />
          <span className="text-4xl font-bold text-gray-900">Chatterbox</span>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-1">
            Welcome Back!
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Please log in to your account.
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/register")}
                className="font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
