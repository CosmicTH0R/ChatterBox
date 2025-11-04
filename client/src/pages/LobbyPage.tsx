// // src/pages/LobbyPage.js
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { Link } from "react-router-dom";

// const LobbyPage = () => {
//   const [rooms, setRooms] = useState([]);
//   const [roomName, setRoomName] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const token = localStorage.getItem("token");

//   // 🔹 Fetch all rooms (Task 18)
//   const fetchRooms = async () => {
//     try {
//       const res = await axios.get("http://localhost:5000/api/rooms", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setRooms(res.data);
//     } catch (err) {
//       console.error("Error fetching rooms:", err);
//       setError("Unable to load rooms. Try again later.");
//     }
//   };

//   useEffect(() => {
//     fetchRooms();
//   }, []);

//   // 🔹 Create room (Task 19)
//   const createRoom = async (e) => {
//     e.preventDefault();
//     if (!roomName.trim()) {
//       setError("Room name cannot be empty.");
//       return;
//     }
//     setLoading(true);
//     setError("");

//     try {
//       await axios.post(
//         "http://localhost:5000/api/rooms",
//         { name: roomName },
//         {
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );
//       setRoomName("");
//       await fetchRooms(); // refresh list
//     } catch (err) {
//       console.error("Error creating room:", err);
//       setError(
//         err.response?.data?.message || "Failed to create room. Try again."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
//       <h2>Available Chat Rooms</h2>

//       {/* Create Room Form */}
//       <form onSubmit={createRoom} style={{ marginBottom: "1rem" }}>
//         <input
//           type="text"
//           placeholder="Enter room name"
//           value={roomName}
//           onChange={(e) => setRoomName(e.target.value)}
//           style={{ padding: "0.5rem", marginRight: "0.5rem" }}
//         />
//         <button type="submit" disabled={loading} style={{ padding: "0.5rem" }}>
//           {loading ? "Creating..." : "Create Room"}
//         </button>
//       </form>

//       {error && <p style={{ color: "red" }}>{error}</p>}

//       {/* Display Rooms */}
//       {rooms.length > 0 ? (
//         <ul>
//           {rooms.map((room) => (
//             <li key={room._id} style={{ margin: "0.5rem 0" }}>
//               {/* 🔹 Task 20: Link to each room */}
//               <Link
//                 to={`/room/${encodeURIComponent(room.name)}`}
//                 style={{
//                   color: "blue",
//                   textDecoration: "none",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {room.name}
//               </Link>
//             </li>
//           ))}
//         </ul>
//       ) : (
//         <p>No rooms available. Create one above.</p>
//       )}
//     </div>
//   );
// };

// export default LobbyPage;








import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"; // <-- Kept original imports
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
  // --- START: Original State & Logic ---
  const [rooms, setRooms] = useState<Room[]>([]); // Added type
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate(); // Added for logout
  const token = localStorage.getItem("token");

  // 🔹 Fetch all rooms (Original Functionality)
  const fetchRooms = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/rooms", {
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
      // Redirect to login if no token
      navigate('/login');
    } else {
      fetchRooms();
    }
  }, [token]); // Added token dependency

  // 🔹 Create room (Original Functionality)
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
        "http://localhost:5000/api/rooms",
        { name: roomName },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRoomName("");
      await fetchRooms(); // refresh list
    } catch (err: any) { // Added 'any' type
      console.error("Error creating room:", err);
      setError(
        err.response?.data?.message || "Failed to create room. Try again."
      );
    } finally {
      setLoading(false);
    }
  };
  // --- END: Original State & Logic ---

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

          {/* --- Create Room Form (Uses original createRoom) --- */}
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
                className="flex-grow w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
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

          {/* --- Original Error Display --- */}
          {error && <p className="text-red-600 text-sm text-center mb-4">{error}</p>}

          {/* --- Display Rooms (Original Logic) --- */}
          <div className="space-y-3">
             <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Available Rooms</h3>
            {rooms.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {rooms.map((room) => (
                  <li key={room._id} className="py-1">
                    {/* --- Original Link Component --- */}
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

