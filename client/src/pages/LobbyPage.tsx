import React, { useEffect, useState, Fragment } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, Transition, Menu } from "@headlessui/react";
import {
  MessageSquareText,
  Hash,
  Plus,
  Loader2,
  Users,
  LogOut,
  ChevronRight,
  Trash2,
  AlertTriangle,
  X,
  Lock,
  Key,
  Clipboard,
  Check,
  List,
  PlusSquare,
  User,
  ChevronDown,
  MessageSquare,
} from "lucide-react";

// (Interfaces are unchanged)
interface Room {
  _id: string;
  name: string;
  creator?: string | { _id: string; username: string };
}
interface MyRoom {
  _id: string;
  name: string;
  inviteCode: string;
  creator: { _id: string; username: string };
}

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  const API_URL = import.meta.env.VITE_API_URL;

  // (All states are unchanged)
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | MyRoom | null>(null);
  const [activeTab, setActiveTab] = useState("public");
  const [userAvatar, setUserAvatar] = useState("");
  const [userName, setUserName] = useState("User");
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [publicRoomName, setPublicRoomName] = useState("");
  const [publicLoading, setPublicLoading] = useState(false);
  const [privateTab, setPrivateTab] = useState("myrooms");
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [myRoomsLoading, setMyRoomsLoading] = useState(true);
  const [privateRoomName, setPrivateRoomName] = useState("");
  const [joinRoomName, setJoinRoomName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [privateCreateLoading, setPrivateCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // (All functions are unchanged)
  const fetchPublicRooms = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicRooms(res.data);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Unable to load public rooms. Try again later.");
    }
  };

  const fetchMyRooms = async () => {
    setMyRoomsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/rooms/myrooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyRooms(res.data);
    } catch (err) {
      console.error("Error fetching my rooms:", err);
    } finally {
      setMyRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const bustedUrl = res.data.avatarUrl.includes("?")
          ? `${res.data.avatarUrl}&_t=${new Date().getTime()}`
          : `${res.data.avatarUrl}?_t=${new Date().getTime()}`;
        setUserAvatar(bustedUrl || "");
        setUserName(res.data.name || res.data.username || "User");
      } catch (err) {
        console.log("Could not fetch user profile for header", err);
      }
    };
    fetchUserProfile();
    if (activeTab === "public") {
      fetchPublicRooms();
    } else {
      fetchMyRooms();
    }
  }, [token, navigate, API_URL, activeTab]);

  const handleCreatePublicRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicRoomName.trim()) {
      setError("Room name cannot be empty.");
      return;
    }
    setPublicLoading(true);
    setError("");
    try {
      await axios.post(
        `${API_URL}/api/rooms`,
        { name: publicRoomName, isPrivate: false },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPublicRoomName("");
      await fetchPublicRooms();
    } catch (err: any) {
      console.error("Error creating public room:", err);
      setError(
        err.response?.data?.message || "Failed to create room. Try again."
      );
    } finally {
      setPublicLoading(false);
    }
  };

  const handleCreatePrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateRoomName.trim()) {
      setError("Room name cannot be empty.");
      return;
    }
    setPrivateCreateLoading(true);
    setError("");
    setNewInviteCode(null);
    try {
      const res = await axios.post(
        `${API_URL}/api/rooms`,
        { name: privateRoomName, isPrivate: true },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setPrivateRoomName("");
      setNewInviteCode(res.data.room.inviteCode);
      await fetchMyRooms(); // Refresh 'My Rooms' list
    } catch (err: any) {
      console.error("Error creating private room:", err);
      setError(
        err.response?.data?.message || "Failed to create private room."
      );
    } finally {
      setPrivateCreateLoading(false);
    }
  };

  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomName.trim() || !inviteCode.trim()) {
      setError("Room name and invite code are required.");
      return;
    }
    setJoinLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/api/rooms/join`,
        { name: joinRoomName, inviteCode },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchMyRooms(); // Refresh list in case they joined
      navigate(`/room/${res.data._id}`);
    } catch (err: any) {
      console.error("Error joining private room:", err);
      setError(err.response?.data?.message || "Invalid name or invite code.");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeletingId(roomToDelete._id);
    setError("");
    setIsModalOpen(false);
    try {
      await axios.delete(`${API_URL}/api/rooms/${roomToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicRooms((prev) =>
        prev.filter((room) => room._id !== roomToDelete._id)
      );
      setMyRooms((prev) =>
        prev.filter((room) => room._id !== roomToDelete._id)
      );
    } catch (err: any) {
      console.error("Error deleting room:", err);
      setError(
        err.response?.data?.message || "Failed to delete room. Try again."
      );
    } finally {
      setDeletingId(null);
      setRoomToDelete(null);
    }
  };

  const openDeleteModal = (room: Room | MyRoom) => {
    setRoomToDelete(room);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setRoomToDelete(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopySuccess(code);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const switchTab = (tab: string) => {
    setError("");
    setNewInviteCode(null);
    setActiveTab(tab);
  };

  // --- RENDER ---
  return (
    <>
      {/* 1. FULL-PAGE CONTAINER is now a flex column */}
      <div className="min-h-screen bg-gray-100 font-inter flex flex-col">
        {/* Header (unchanged) */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">
                Chatterbox
              </span>
            </div>

            {/* Profile Dropdown */}
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition-colors">
                  <img
                    src={
                      userAvatar || "https://api.dicebear.com/7.x/bottts/svg"
                    }
                    alt="Profile"
                    className="w-6 h-6 rounded-full bg-gray-200 object-cover border border-gray-200"
                    onError={(e) =>
                      (e.currentTarget.src =
                        "https://api.dicebear.com/7.x/bottts/svg")
                    }
                  />
                  <span className="hidden sm:block">{userName}</span>
                  <ChevronDown
                    className="w-4 h-4 text-gray-400"
                    aria-hidden="true"
                  />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/profile")}
                          className={`${
                            active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700"
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          <User className="mr-2 h-5 w-5" aria-hidden="true" />
                          My Profile
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/friends")}
                          className={`${
                            active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700"
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          <Users className="mr-2 h-5 w-5" aria-hidden="true" />
                          Friends
                        </button>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => navigate("/conversations")}
                          className={`${
                            active
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700"
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          <MessageSquare
                            className="mr-2 h-5 w-5"
                            aria-hidden="true"
                          />
                          Messages
                        </button>
                      )}
                    </Menu.Item>
 
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={`${
                            active ? "bg-red-50 text-red-700" : "text-gray-700"
                          } group flex w-full items-center px-4 py-2 text-sm`}
                        >
                          <LogOut className="mr-2 h-5 w-5" aria-hidden="true" />
                          Logout
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </header>

        {/* 2. MAIN CONTENT AREA: now grows to fill space */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12 grow flex flex-col w-full">
          {/* 3. Lobby Card: now grows to fill space */}
          <div className="max-w-7xl mx-auto bg-white p-8 rounded-2xl shadow-xl w-full flex flex-col grow">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl font-bold text-gray-900">Chat Lobby</h2>
            </div>

            {/* Main Tab Buttons */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => switchTab("public")}
                className={`flex-1 py-3 text-center font-semibold ${
                  activeTab === "public"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Public Rooms
              </button>
              <button
                onClick={() => switchTab("private")}
                className={`flex-1 py-3 text-center font-semibold ${
                  activeTab === "private"
                    ? "border-b-2 border-indigo-600 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Private Rooms
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <p className="text-red-600 text-sm text-center mb-4">{error}</p>
            )}

            {/* 4. Tab Content Wrapper: now grows and is a flex col */}
            <div className="grow flex flex-col">
              {/* Public Tab Content */}
              {activeTab === "public" && (
                <div className="space-y-8 flex flex-col grow">
                  {/* Create Public Room Form */}
                  <form onSubmit={handleCreatePublicRoom}>
                    <h3 className="text-lg font-semibold text-gray-800 pb-2 mb-4 border-b border-gray-300">
                      Create a New Public Room
                    </h3>
                    <div className="flex gap-4">
                      <input
                        id="publicRoomName"
                        type="text"
                        placeholder="Enter room name"
                        value={publicRoomName}
                        onChange={(e) => setPublicRoomName(e.target.value)}
                        className="grow w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={publicLoading}
                        className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                      >
                        {publicLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Plus className="w-5 h-5" />
                        )}
                        {publicLoading ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>

                  <div className="border-b border-gray-900" />

                  {/* Public Rooms List */}
                  <div className="space-y-3 flex flex-col grow">
                    <h3 className="text-lg font-semibold text-gray-800 pb-2 mb-4 border-b border-gray-300">
                      Available Public Rooms
                    </h3>

                    <div className="overflow-y-auto grow">
                      {publicRooms.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                          {publicRooms.map((room) => {
                            const creatorId = room.creator
                              ? typeof room.creator === "string"
                                ? room.creator
                                : room.creator._id
                              : null;

                            return (
                              <li
                                key={room._id}
                                className="py-1 flex items-center justify-between"
                              >
                                <Link
                                  to={`/room/${room._id}`}
                                  className="flex items-center justify-between p-3 rounded-lg text-indigo-700 hover:bg-indigo-50 transition grow"
                                >
                                  <div className="flex items-center gap-3">
                                    <Hash className="w-5 h-5 text-gray-500" />
                                    <span className="text-lg font-medium">
                                      {room.name}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Link>
                                {creatorId === currentUserId && (
                                  <button
                                    onClick={() => openDeleteModal(room)}
                                    disabled={deletingId === room._id}
                                    className="shrink-0 p-3 ml-2 rounded-lg text-red-600 hover:bg-red-100 disabled:text-gray-400"
                                  >
                                    {deletingId === room._id ? (
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-5 h-5" />
                                    )}
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        // 5. Centered "empty" message
                        <div className="grow flex items-center justify-center h-full">
                          <p className="text-gray-500">
                            No public rooms available. Create one!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Private Tab Content */}
              {activeTab === "private" && (
                <div className="space-y-6 flex flex-col grow">
                  {/* New Private Sub-Tabs */}
                  <div className="flex justify-center rounded-lg bg-gray-100 p-1">
                    <button
                      onClick={() => setPrivateTab("myrooms")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 ${
                        privateTab === "myrooms"
                          ? "bg-white shadow text-indigo-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Your Rooms
                    </button>
                    <button
                      onClick={() => setPrivateTab("create")}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold flex items-center justify-center gap-2 ${
                        privateTab === "create"
                          ? "bg-white shadow text-indigo-700"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <PlusSquare className="w-4 h-4" />
                      Create / Join
                    </button>
                  </div>

                  {/* Conditional Content for "Your Rooms" */}
                  {privateTab === "myrooms" && (
                    <div className="space-y-3 flex flex-col grow">
                      <h3 className="text-lg font-semibold text-gray-800 pb-2 border-b border-gray-300">
                        Your Private Rooms
                      </h3>

                      <div className="overflow-y-auto grow">
                        {myRoomsLoading ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                          </div>
                        ) : myRooms.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {myRooms.map((room) => (
                              <li
                                key={room._id}
                                className="py-1 flex items-center justify-between"
                              >
                                {/* Clickable Link Area */}
                                <Link
                                  to={`/room/${room._id}`}
                                  className="flex items-center justify-between p-3 rounded-lg text-indigo-700 hover:bg-indigo-50 transition grow"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="text-lg font-medium truncate">
                                      {room.name}
                                    </span>
                                    <p className="text-sm text-gray-500 truncate">
                                      Creator: {room.creator.username}
                                      {room.creator._id === currentUserId &&
                                        " (You)"}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Link>

                                {/* Actions Area */}
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-md font-bold text-gray-700 p-2 bg-gray-100 rounded-md">
                                    {room.inviteCode}
                                  </span>
                                  <button
                                    onClick={() => copyInvite(room.inviteCode)}
                                    className="flex items-center justify-center p-3 rounded-lg text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50"
                                  >
                                    {copySuccess === room.inviteCode ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Clipboard className="w-4 h-4" />
                                    )}
                                  </button>
                                  {room.creator._id === currentUserId && (
                                    <button
                                      onClick={() => openDeleteModal(room)}
                                      disabled={deletingId === room._id}
                                      className="p-3 rounded-lg text-red-600 hover:bg-red-100 disabled:text-gray-400"
                                    >
                                      {deletingId === room._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          // 5. Centered "empty" message
                          <div className="grow flex items-center justify-center h-full">
                            <p className="text-gray-500">
                              You haven't created or joined any private rooms
                              yet.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conditional Content for "Create/Join" */}
                  {privateTab === "create" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 grow">
                      {/* Column 1: Create Private Room */}
                      <div className="space-y-4">
                        <form onSubmit={handleCreatePrivateRoom}>
                          <h3 className="text-lg font-semibold text-gray-800 pb-2 mb-4 border-b border-gray-300">
                            Create a Private Room
                          </h3>
                          <div className="flex gap-4">
                            <input
                              type="text"
                              placeholder="Enter new room name"
                              value={privateRoomName}
                              onChange={(e) =>
                                setPrivateRoomName(e.target.value)
                              }
                              className="grow w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="submit"
                              disabled={privateCreateLoading}
                              className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                            >
                              {privateCreateLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Lock className="w-5 h-5" />
                              )}
                              {privateCreateLoading ? "Creating..." : "Create"}
                            </button>
                          </div>
                        </form>

                        {newInviteCode && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-800">
                              Success! Share this invite code:
                            </h4>
                            <div className="flex justify-between items-center mt-2 gap-2">
                              <span className="text-xl font-bold text-green-700 p-2 bg-green-100 rounded-md">
                                {newInviteCode}
                              </span>
                              <button
                                onClick={() => copyInvite(newInviteCode)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white rounded-lg shadow-sm border border-gray-300 hover:bg-gray-50"
                              >
                                {copySuccess === newInviteCode ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Clipboard className="w-4 h-4" />
                                )}
                                {copySuccess === newInviteCode
                                  ? "Copied!"
                                  : "Copy"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* This div contains the mobile divider AND the desktop join form */}
                      <div>
                        {/* Mobile-only divider */}
                        <div className="my-8 border-b border-gray-900 md:hidden" />

                        {/* Desktop-only vertical divider */}
                        <div className="hidden md:block my-8 border-b border-gray-900 md:my-0 md:border-b-0 md:border-l md:border-gray-900 md:pl-8 h-full">
                          {/* Form B: Join Private Room */}
                          <form onSubmit={handleJoinPrivateRoom}>
                            <h3 className="text-lg font-semibold text-gray-800 pb-2 mb-4 border-b border-gray-300">
                              Join a Private Room
                            </h3>
                            <div className="space-y-4">
                              <input
                                type="text"
                                placeholder="Enter room name"
                                value={joinRoomName}
                                onChange={(e) =>
                                  setJoinRoomName(e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <input
                                type="text"
                                placeholder="Enter invite code"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <button
                                type="submit"
                                disabled={joinLoading}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-green-600 shadow-md hover:bg-green-700 transition disabled:bg-green-400"
                              >
                                {joinLoading ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Key className="w-5 h-5" />
                                )}
                                {joinLoading ? "Joining..." : "Join Room"}
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* Mobile-only Join Room Form */}
                        <form
                          className="md:hidden"
                          onSubmit={handleJoinPrivateRoom}
                        >
                          <h3 className="text-lg font-semibold text-gray-800 pb-2 mb-4 border-b border-gray-300">
                            Join a Private Room
                          </h3>
                          <div className="space-y-4">
                            <input
                              type="text"
                              placeholder="Enter room name"
                              value={joinRoomName}
                              onChange={(e) =>
                                setJoinRoomName(e.target.value)
                              }
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              placeholder="Enter invite code"
                              value={inviteCode}
                              onChange={(e) => setInviteCode(e.target.value)}
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="submit"
                              disabled={joinLoading}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-green-600 shadow-md hover:bg-green-700 transition disabled:bg-green-400"
                            >
                              {joinLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Key className="w-5 h-5" />
                              )}
                              {joinLoading ? "Joining..." : "Join Room"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Modal (unchanged) */}
      {isModalOpen && roomToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="relative max-w-md w-full bg-white p-6 rounded-2xl shadow-xl m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeDeleteModal}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start">
              <div className="mx-auto shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle
                  className="h-6 w-6 text-red-600"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  className="text-lg leading-6 font-bold text-gray-900"
                  id="modal-title"
                >
                  Delete Room
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete the room "
                    <strong className="text-gray-700">
                      {roomToDelete.name}
                    </strong>
                    "? All messages... will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="button"
                disabled={deletingId === roomToDelete._id}
                onClick={handleConfirmDelete}
                className="w-full inline-flex justify-center rounded-lg border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-semibold text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-300"
              >
                {deletingId === roomToDelete._id ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                Delete
              </button>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LobbyPage;