import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // <-- Removed Link
import { toast, Toaster } from "react-hot-toast";
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  ArrowLeft,
  MessageSquareText,
  UserCheck,
  UserX,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import UserInfoModal from "../components/UserInfoModal"; // <-- 1. IMPORT MODAL

// --- INTERFACES ---
interface Friend {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface Request {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

// --- DEFAULT AVATAR ---
const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // --- STATE ---
  const [activeTab, setActiveTab] = useState("all");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Request[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for the "Remove Friend" confirmation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);

  // --- 2. ADD NEW STATE FOR INFO MODAL ---
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/friends/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFriends(data.friends || []);
      setReceivedRequests(data.receivedRequests || []);
    } catch (err) {
      console.error("Failed to fetch friends data", err);
      toast.error("Could not load your friends list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [token, navigate]);

  // --- API HANDLERS (Unchanged) ---
  const handleSendRequest = async (e: React.FormEvent) => {
    // ... (your existing code)
    e.preventDefault();
    if (!addUsername.trim()) {
      toast.error("Please enter a username.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Sending request...");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/friends/send`,
        { username: addUsername },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message, { id: toastId });
      setAddUsername("");
      fetchData(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send request.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    // ... (your existing code)
     const toastId = toast.loading("Accepting...");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/friends/accept`,
        { requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message, { id: toastId });
      fetchData(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to accept.", {
        id: toastId,
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    // ... (your existing code)
    const toastId = toast.loading("Rejecting...");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/friends/reject`,
        { requestId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message, { id: toastId });
      fetchData(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject.", {
        id: toastId,
      });
    }
  };

  const handleRemoveFriend = async () => {
    // ... (your existing code)
    if (!friendToRemove) return;
    
    setIsSubmitting(true);
    const toastId = toast.loading("Removing friend...");
    try {
      const { data } = await axios.delete(
        `${API_URL}/api/friends/${friendToRemove._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(data.message, { id: toastId });
      closeModal();
      fetchData(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove friend.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- REMOVE FRIEND MODAL HANDLERS ---
  const openModal = (e: React.MouseEvent, friend: Friend) => {
    e.stopPropagation(); // Stop click from bubbling up to the modal opener
    setFriendToRemove(friend);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFriendToRemove(null);
  };

  // --- 3. NEW INFO MODAL HANDLERS ---
  const openInfoModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedUserId(null);
  };

  // --- RENDER HELPER ---
  const renderTabContent = () => {
    if (isLoading) {
      // ... (unchanged)
       return (
        <div className="grow flex justify-center items-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
        </div>
      );
    }

    // --- 4. TAB 1: ALL FRIENDS (UPDATED) ---
    if (activeTab === "all") {
      return (
        <div className="grow flex flex-col">
          {friends.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {friends.map((friend) => (
                <li
                  key={friend._id}
                  className="py-4 flex items-center justify-between"
                >
                  {/* Replaced Link with Button to open modal */}
                  <button
                    type="button"
                    onClick={() => openInfoModal(friend._id)}
                    className="flex items-center gap-4 grow hover:opacity-80 transition-opacity text-left"
                  >
                    <img
                      src={friend.avatarUrl || DEFAULT_AVATAR}
                      alt={friend.username}
                      className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                      onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                    />
                    <div>
                      <span className="font-semibold text-gray-800">
                        {friend.name || friend.username}
                      </span>
                      <p className="text-sm text-gray-500">@{friend.username}</p>
                    </div>
                  </button>

                  <button
                    onClick={(e) => openModal(e, friend)} // Pass event to stop propagation
                    className="p-2 rounded-lg text-red-600 hover:bg-red-100 shrink-0 ml-4"
                    title="Remove friend"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grow flex items-center justify-center h-full">
              <p className="text-gray-500">
                You haven't added any friends yet.
              </p>
            </div>
          )}
        </div>
      );
    }

    // --- 5. TAB 2: PENDING REQUESTS (UPDATED) ---
    if (activeTab === "pending") {
      return (
        <div className="grow flex flex-col">
          {receivedRequests.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {receivedRequests.map((req) => (
                <li
                  key={req._id}
                  className="py-4 flex items-center justify-between"
                >
                  {/* Replaced div with Button to open modal */}
                  <button
                    type="button"
                    onClick={() => openInfoModal(req._id)}
                    className="flex items-center gap-4 grow hover:opacity-80 transition-opacity text-left"
                  >
                    <img
                      src={req.avatarUrl || DEFAULT_AVATAR}
                      alt={req.username}
                      className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                      onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                    />
                    <div>
                      <span className="font-semibold text-gray-800">
                        {req.name || req.username}
                      </span>
                      <p className="text-sm text-gray-500">@{req.username}</p>
                    </div>
                  </button>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => handleAcceptRequest(req._id)}
                      className="p-2 rounded-lg text-green-600 hover:bg-green-100"
                      title="Accept"
                    >
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req._id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-100"
                      title="Reject"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grow flex items-center justify-center h-full">
              <p className="text-gray-500">
                You have no pending friend requests.
              </p>
            </div>
          )}
        </div>
      );
    }

    // --- TAB 3: ADD FRIEND (Unchanged) ---
    if (activeTab === "add") {
      return (
        <form onSubmit={handleSendRequest} className="space-y-4 pt-4">
         {/* ... (your existing form code) ... */}
           <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Add Friend by Username
            </label>
            <div className="relative">
              <UserPlus className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" />
              <input
                id="username"
                type="text"
                placeholder="Enter a username"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {isSubmitting ? "Sending..." : "Send Friend Request"}
          </button>
        </form>
      );
    }

    return null;
  };

  // --- RENDER ---
  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-100 font-inter flex flex-col">
        {/* Header (unchanged) */}
        <header className="bg-white shadow-sm">
          {/* ... (your existing header code) ... */}
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

        {/* Page Content (unchanged) */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grow flex flex-col w-full">
          {/* ... (your existing main/title code) ... */}
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-900">
              Manage Friends
            </h2>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col grow">
            {/* Tab Navigation (unchanged) */}
            <div className="flex border-b border-gray-200">
             {/* ... (your existing tab buttons) ... */}
             <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-4 text-center font-semibold flex justify-center items-center gap-2 ${
                  activeTab === "all"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Users className="w-5 h-5" />
                All Friends
                {friends.length > 0 && (
                  <span className="bg-gray-200 text-gray-700 text-xs font-bold rounded-full px-2 py-0.5">
                    {friends.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`flex-1 py-4 text-center font-semibold flex justify-center items-center gap-2 ${
                  activeTab === "pending"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Mail className="w-5 h-5" />
                Pending
                {receivedRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                    {receivedRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("add")}
                className={`flex-1 py-4 text-center font-semibold flex justify-center items-center gap-2 ${
                  activeTab === "add"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <UserPlus className="w-5 h-5" />
                Add Friend
              </button>
            </div>

            {/* Tab Content (unchanged) */}
            <div className="p-6 sm:p-8 grow flex flex-col">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Remove Friend Confirmation Modal (unchanged) */}
      <Transition appear show={isModalOpen} as={Fragment}>
        {/* ... (your existing modal code) ... */}
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
                    className="text-lg font-bold text-gray-900 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Remove Friend
                  </Dialog.Title>
                  <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to remove{" "}
                      <strong className="text-gray-700">
                        {friendToRemove?.username}
                      </strong>{" "}
                      from your friends list?
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
                      onClick={handleRemoveFriend}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        "Remove"
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- 6. ADD THE NEW INFO MODAL --- */}
      <UserInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        userId={selectedUserId}
        onStatusChange={() => {
          fetchData(); // Refetch friend data when status changes (e.g., accept/reject)
        }}
      />
    </>
  );
};

export default FriendsPage;