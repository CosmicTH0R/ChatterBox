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
  ChevronRight
} from 'lucide-react';

// --- Type definition for a room ---
interface Room {
  _id: string;
  name: string;
}

const LobbyPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ✅ Use environment variable for API base URL
  const API_URL = import.meta.env.VITE_API_URL;

  // 🔹 Fetch all rooms
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
    if (!token) {
      navigate('/login');
    } else {
      fetchRooms();
    }
  }, [token]);

  // 🔹 Create room
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
      await fetchRooms();
    } catch (err: any) {
      console.error("Error creating room:", err);
      setError(
        err.response?.data?.message || "Failed to create room. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <div className="max-w-2xl w-full">
        <div className="flex justify-between items-center space-x-2 mb-8">
          <div className="flex items-center space-x-2">
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

        <div className="bg-white p-8 rounded-2xl shadow-xl w-full">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-900">Chat Lobby</h2>
          </div>

          {/* --- Create Room Form --- */}
          <form onSubmit={createRoom} className="mb-6">
            <label htmlFor="roomName" className="block text-sm font-semibold text-gray-700 mb-2">
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

          {/* --- Error Display --- */}
          {error && <p className="text-red-600 text-sm text-center mb-4">{error}</p>}

          {/* --- Display Rooms --- */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Available Rooms</h3>
            {rooms.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {rooms.map((room) => (
                  <li key={room._id} className="py-1">
                    <Link
                      to={`/room/${encodeURIComponent(room.name)}`}
                      className="flex items-center justify-between p-3 rounded-lg text-indigo-700 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Hash className="w-5 h-5 text-gray-500" />
                        <span className="text-lg font-medium">{room.name}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center py-4">No rooms available. Create one above.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
