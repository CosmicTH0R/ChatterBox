import React, { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";
import {
  MessageSquareText, User, Lock, Eye, EyeOff, Loader2,
  Save, ArrowLeft, Mail, Camera, X,
} from "lucide-react";

// --- NEW: Cache-busting function ---
// This appends a unique timestamp to a URL to bypass browser cache
const addCacheBuster = (url: string) => {
  if (!url) return "";
  // Check if URL already has query params
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_t=${new Date().getTime()}`;
};


const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";
  const API_URL = import.meta.env.VITE_API_URL;

  // (States are all the same)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

  // --- Data Fetching (UPDATED) ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsFetchingData(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setName(data.name || "");
        setEmail(data.email || "");
        
        // --- FIX 1: Add cache-buster on initial load ---
        setAvatarUrl(addCacheBuster(data.avatarUrl || ""));

      } catch (err) {
        console.error("Failed to fetch profile", err);
        toast.error("Could not load your profile data.");
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchUserProfile();
  }, [token]);

  // (Image Handlers are the same)
  const handleImageClick = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // --- Form Handlers (UPDATED) ---
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    const toastId = toast.loading("Saving profile...");
    let uploadedAvatarUrl = avatarUrl.split("?")[0]; // Get the "clean" URL without old timestamp

    // --- 1. UPLOAD IMAGE (if a new one was selected) ---
    if (selectedFile) {
      toast.loading("Uploading image...", { id: toastId });
      const formData = new FormData();
      formData.append("avatar", selectedFile); 

      try {
        const { data } = await axios.post(
          `${API_URL}/api/users/upload-avatar`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        uploadedAvatarUrl = data.url; // This is a "clean" URL
        setSelectedFile(null);
        setPreviewUrl(null); // Clear preview, so displayAvatar uses avatarUrl
      } catch (err) {
        console.error("Image upload error:", err);
        toast.error("Image upload failed. Profile not saved.", { id: toastId });
        setProfileLoading(false);
        return;
      }
    }

    // --- 2. SAVE THE ENTIRE PROFILE ---
    try {
      toast.loading("Saving profile details...", { id: toastId });
      
      const { data: savedUser } = await axios.put(
        `${API_URL}/api/users/profile`,
        { name, email, avatarUrl: uploadedAvatarUrl }, // Send the "clean" URL to save in DB
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // --- 3. UPDATE STATE FROM "SOURCE OF TRUTH" (FIXED) ---
      setName(savedUser.name);
      setEmail(savedUser.email);
      
      // --- FIX 2: Add a NEW cache-buster to the saved URL ---
      setAvatarUrl(addCacheBuster(savedUser.avatarUrl)); // This forces the <img> to reload

      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update profile.", {
        id: toastId,
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // (Password Change Handler is the same)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields."); return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long."); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match."); return;
    }

    setPasswordLoading(true);
    const toastId = toast.loading("Updating password...");
    try {
      await axios.post(
        `${API_URL}/api/auth/update-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Password updated successfully!", { id: toastId });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password.", {
        id: toastId,
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleShowPassword = (field: "old" | "new" | "confirm") => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // --- UPDATED: This logic now correctly chooses the right image ---
  const displayAvatar =
    previewUrl || avatarUrl || "https://api.dicebear.com/7.x/bottts/svg";

  // --- RENDER (No changes from here down) ---
  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-100 font-inter">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <MessageSquareText className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">
                Chatterbox
              </span>
            </div>
            <button
              onClick={() => navigate("/lobby")}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lobby
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Account Settings
          </h1>

          {isFetchingData ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="space-y-10">
              {/* --- SECTION 1: PROFILE INFORMATION --- */}
              <form
                onSubmit={handleProfileSave}
                className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:items-center flex ">
                  {/* Left Column: Avatar */}
                  <div className="md:col-span-1 flex justify-center">

                    <div
                      className="relative w-32 h-32 cursor-pointer group"
                      onClick={handleImageClick}
                    >
                      <img
                        src={displayAvatar}
                        alt="Avatar"
                        className="w-32 h-32 rounded-full bg-gray-200 border-2 border-gray-300 object-cover"
                        onError={(e) =>
                          (e.currentTarget.src =
                            "https://api.dicebear.com/7.x/bottts/svg")
                        }
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8" />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg, image/gif"
                    />
                  </div>

                  {/* Right Column: Form Fields */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-semibold text-gray-700 mb-2"
                        >
                          Name
                        </label>
                        <div className="relative">
                          <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                          <input
                            id="name" type="text" placeholder="Your display name"
                            value={name} onChange={(e) => setName(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="username"
                          className="block text-sm font-semibold text-gray-700 mb-2"
                        >
                          Username
                        </label>
                        <div className="relative">
                          <User className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                          <input
                            id="username" type="text" value={username}
                            disabled
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          id="email" type="email" placeholder="your@email.com"
                          value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Footer: Save Button */}
                <div className="flex justify-end border-t border-gray-200 pt-6 mt-8">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                  >
                    {profileLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {profileLoading ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>

              {/* --- SECTION 2: SECURITY --- */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Security
          </h1>
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center ">
                  <div>
                    <h4 className="font-semibold text-gray-800">Password</h4>
                    <p className="text-sm text-gray-500">
                      Change your password.
                    </p> 
                    {/* ^--- THIS IS THE FIX ---^ */}
                  </div>
                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gray-800 shadow-md hover:bg-gray-900 transition"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- PASSWORD MODAL --- */}
      <Transition appear show={isPasswordModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 font-inter"
          onClose={() => setIsPasswordModalOpen(false)}
        >
          {/* 1. The overlay */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>

          {/* 2. The modal content */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-bold text-gray-900 mb-4"
                  >
                    Change Password
                  </Dialog.Title>
                  <button
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <form
                    onSubmit={handlePasswordChange}
                    className="space-y-6 mt-6"
                  >
                    {/* Old Password */}
                    <div>
                      <label
                        htmlFor="oldPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Old Password
                      </label>
                      <div className="relative">
                        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          id="oldPassword"
                          type={showPasswords.old ? "text" : "password"}
                          placeholder="••••••••"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword("old")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600"
                        >
                          {showPasswords.old ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {/* New Password */}
                    <div>
                      <label
                        htmlFor="newPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          id="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          placeholder="New password (min. 6 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword("new")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Confirm New Password */}
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
                        <input
                          id="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword("confirm")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                      >
                        {passwordLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5" />
                        )}
                        {passwordLoading ? "Saving..." : "Save Password"}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ProfilePage;