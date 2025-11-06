import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  MessageSquareText,
  Hash,
  Plus,
  Loader2,
  Users,
  LogOut,
  ChevronRight,
  Trash2,
  AlertTriangle, // Added for modal
  X, // Added for modal
} from "lucide-react";

interface Room {
  _id: string;
  name: string;
  creator?: string | { _id: string; username: string };
}

const LobbyPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // For creating
  const [deletingId, setDeletingId] = useState<string | null>(null); // For deleting spinner

  // --- New state for the delete modal ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  
  // Use VITE_API_URL or a fallback - Patched for build warning
  const API_URL = "http://localhost:5000";

  // Fetch all rooms from backend
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setError("Unable to load rooms. Try again later.");
    }
  };

  useEffect(() => {
    if (!token) navigate("/login");
    else fetchRooms();
  }, [token, navigate, API_URL]);

  // Create new room
  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      setError("Room name cannot be empty.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${API_URL}/api/rooms`,
        { name: roomName },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRoomName("");
      await fetchRooms(); // Refresh list
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(
        err.response?.data?.message || "Failed to create room. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ Step 1: Renamed 'handleDelete' to 'handleConfirmDelete'
   * This is now only called when the user clicks "Confirm" in the modal.
   */
  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;

    setDeletingId(roomToDelete._id); // Show spinner
    setError("");
    setIsModalOpen(false); // Close modal

    try {
      await axios.delete(`${API_URL}/api/rooms/${roomToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // On success, update React state
      setRooms((prevRooms) =>
        prevRooms.filter((room) => room._id !== roomToDelete._id)
      );
    } catch (err: any) {
      console.error("Error deleting room:", err);
      setError(
        err.response?.data?.message || "Failed to delete room. Try again."
      );
    } finally {
      setDeletingId(null); // Hide spinner
      setRoomToDelete(null); // Clear target room
    }
  };

  /**
   * ✅ Step 2: Create new functions to open/close the modal
   */
  const openDeleteModal = (room: Room) => {
    setRoomToDelete(room);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setRoomToDelete(null);
  };

  // Update Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
        <div className="max-w-2xl w-full">
          {/* ... (Header and Lobby Card) ... */}
          <div className="flex justify-between items-center mb-8">
             <div className="flex items-center gap-2">
               <MessageSquareText className="w-10 h-10 text-indigo-600" />
               <span className="text-4xl font-bold text-gray-900">Chatterbox</span>
             </div>
             <button
               onClick={handleLogout}
               className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50"
             >
               <LogOut className="w-4 h-4" />
               Logout
             </button>
           </div>
 
           {/* Lobby Card */}
           <div className="bg-white p-8 rounded-2xl shadow-xl w-full">
             <div className="flex items-center gap-3 mb-6">
               <Users className="w-8 h-8 text-indigo-600" />
               <h2 className="text-3xl font-bold text-gray-900">Chat Lobby</h2>
             </div>

          {/* Create Room Form */}
          <form onSubmit={createRoom} className="mb-6">
            <label
              htmlFor="roomName"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Create a New Room
            </label>
            <div className="flex gap-4">
              <input
                id="roomName"
                type="text"
                placeholder="Enter room name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="grow w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <p className="text-red-600 text-sm text-center mb-4">{error}</p>
          )}

          {/* Rooms List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
              Available Rooms
            </h3>

            {rooms.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {rooms.map((room) => {
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
                      {/* Link to join room */}
                      <Link
                        to={`/room/${room._id}`}
                        className="flex items-center justify-between p-3 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors grow"
                      >
                        <div className="flex items-center gap-3">
                          <Hash className="w-5 h-5 text-gray-500" />
                          <span className="text-lg font-medium">
                            {room.name}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>

                      {/* ✅ Step 3: Update Delete Button's onClick */}
                      {creatorId === currentUserId && (
                        <button
                          onClick={() => openDeleteModal(room)} // Changed
                          disabled={deletingId === room._id}
                          className="shrink-0 p-3 ml-2 rounded-lg text-red-600 hover:bg-red-100 disabled:text-gray-400 transition-colors"
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
              <p className="text-gray-500 text-center py-4">
                No rooms available. Create one above.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* ✅ Step 4: Add the Modal JSX */}
      {isModalOpen && roomToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-md w-full bg-white p-6 rounded-2xl shadow-xl m-4">
            {/* Close Button */}
            <button
              onClick={closeDeleteModal}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start">
              {/* Icon */}
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
                    "? All messages in this room will be permanently deleted.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="button"
                disabled={deletingId === roomToDelete._id}
                onClick={handleConfirmDelete}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-semibold text-white hover:bg-red-700 sm:w-auto sm:text-sm disabled:bg-red-300"
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