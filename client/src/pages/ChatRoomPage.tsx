import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios"; // Import axios to fetch room details
import {
  ArrowLeft,
  Send,
  User,
  Zap,
  Users,
  X,
  Clock,
  Clipboard, // 1. Added Clipboard icon
} from "lucide-react";
import { format } from "date-fns";
import { toast, Toaster } from "react-hot-toast"; // 2. Added Toaster

/*
 * Matches the populated data from the backend.
 */
interface Message {
  _id: string | number; // Allow number for temporary pending ID
  text: string;
  timestamp: string;
  user: {
    _id: string;
    username: string;
  };
  isPending?: boolean; // For your optimistic UI
}

const ChatRoomPage: React.FC = () => {
  const navigate = useNavigate();
  /**
   * ✅ Task 4: Get roomId from URL params
   */
  const { roomId } = useParams<{ roomId: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);

  // 🔹 Bonus: Add state to hold the room name
  const [roomName, setRoomName] = useState("Loading room...");

  /**
   * ✅ Task 20: Add state for invite code
   */
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resolved build warning by hardcoding fallback
  const SOCKET_URL =  import.meta.env.VITE_API_URL || "http://localhost:5000";
  const API_URL = import.meta.env.VITE_API_URL;

  const currentUser = localStorage.getItem("username");
  const token = localStorage.getItem("token");

  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!socket || !currentUser || !roomId) return;

    /**
     * ✅ Task 4: Emit 'typing' with roomId
     */
    socket.emit("typing", { roomId, user: currentUser });
  };

  // 🔹 Bonus: Fetch room details to get the name
  useEffect(() => {
    if (!roomId || !token) return;

    const fetchRoomDetails = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoomName(res.data.name); // Set the room name from the API
      } catch (err) {
        console.error("Error fetching room details:", err);
        setRoomName("Private Room");
        // Optionally navigate away if room not found
        // navigate("/lobby");
      }
    };
    fetchRoomDetails();
  }, [roomId, token, API_URL, navigate]);

  // Socket connection effect
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [SOCKET_URL, token, navigate]);

  // Socket event listeners effect
  useEffect(() => {
    if (!socket || !roomId) return; // Must have socket and roomId

    /**
     * ✅ Task 4: Emit 'joinRoom' with roomId
     */
    socket.emit("joinRoom", { roomId });

    // --- NEW LISTENERS FOR TASK 8 ---
    socket.on("loadHistory", (history: Message[]) => {
      setMessages(history);
    });

    socket.on("receiveMessage", (pendingMsg: Message) => {
      setMessages((prev) => [...prev, pendingMsg]);
      if (pendingMsg.user.username !== currentUser) {
        setTypingUsers((prev) =>
          prev.filter((u) => u !== pendingMsg.user.username)
        );
      }
    });

    socket.on(
      "messageConfirmed",
      (data: { tempId: string | number; savedMessage: Message }) => {
        const { tempId, savedMessage } = data;

        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? savedMessage : msg))
        );
      }
    );

    // --- Other listeners ---

    socket.on("systemMessage", (msg) => {
      const systemMessage: Message = {
        _id: new Date().getTime(),
        text: msg,
        timestamp: new Date().toISOString(),
        user: { _id: "system", username: "System" },
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("updateUserList", (userList: string[]) => {
      setOnlineUsers(userList);
    });

    socket.on("userTyping", (user: string) => {
      if (!user || user === currentUser) return;
      setTypingUsers((prev) => (prev.includes(user) ? prev : [...prev, user]));
      if (typingTimeouts.current[user])
        clearTimeout(typingTimeouts.current[user]);
      typingTimeouts.current[user] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== user));
        delete typingTimeouts.current[user];
      }, 2000);
    });

    /**
     * ✅ Task 20: Listen for room details
     * (Sent by server only if user is the creator)
     */
    socket.on("roomDetails", (details: { inviteCode: string }) => {
      if (details.inviteCode) {
        setInviteCode(details.inviteCode);
      }
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    // Cleanup all listeners
    return () => {
      socket.off("loadHistory");
      socket.off("receiveMessage");
      socket.off("messageConfirmed");
      socket.off("systemMessage");
      socket.off("updateUserList");
      socket.off("userTyping");
      socket.off("roomDetails"); // <-- Cleanup
      socket.off("connect_error");
    };
  }, [socket, roomId, currentUser]);

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket || !roomId) return;
    socket.emit("sendMessage", { roomId, text });
    setText("");
    setTypingUsers((prev) => prev.filter((u) => u !== currentUser));
  };

  /**
   * ✅ Task 21: Add Copy Invite function
   */
  const copyInvite = () => {
    if (!inviteCode || !roomName) return;
    const inviteText = `Join my room "${roomName}" on Chatterbox! Code: ${inviteCode}`;

    navigator.clipboard.writeText(inviteText).then(
      () => {
        toast.success("Invite copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy invite.");
      }
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      {/* 3. Added Toaster component */}
      <Toaster position="top-center" />
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Sidebar Desktop */}
        <div className="hidden md:flex flex-col w-48 border-r border-gray-200 p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-2">Who's Online</h3>
          <ul className="space-y-2">
            {onlineUsers.map((user) => (
              <li key={user} className="flex items-center gap-2 text-gray-900">
                <span className="w-3 h-3 bg-green-500 rounded-full" /> {user}
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Drawer */}
        {isUserListOpen && (
          <div
            onClick={() => setIsUserListOpen(false)}
            className="absolute inset-0 bg-black/30 z-10 md:hidden"
          />
        )}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-gray-50 p-4 shadow-xl transition-transform duration-300 ease-in-out z-20 md:hidden ${
            isUserListOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700">Who's Online</h3>
            <button
              onClick={() => setIsUserListOpen(false)}
              className="p-1 rounded-lg text-gray-600 hover:bg-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-2">
            {onlineUsers.map((user) => (
              <li key={user} className="flex items-center gap-2 text-gray-900">
                <span className="w-3 h-3 bg-green-500 rounded-full" /> {user}
              </li>
            ))}
          </ul>
        </div>

        {/* Main Chat */}
        <div className="flex flex-col grow">
          {/* Header */}
          <div className="relative flex flex-col items-center p-4 border-b bg-white z-10">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate("/lobby")}
                className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline md:ml-2">Back to Lobby</span>
              </button>

              <h2 className="text-xl font-bold text-gray-900">{roomName}</h2>

              {/* Mobile Users Button */}
              <button
                onClick={() => setIsUserListOpen(true)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
              >
                <Users className="w-5 h-5" />
              </button>

              {/**
               * ✅ Task 21: Add "Copy Invite" button for desktop
               * Replaces the empty placeholder div
               */}
              <div
                className="hidden md:flex justify-end"
                style={{ width: "130px" }} // Give it space
              >
                {inviteCode && (
                  <button
                    onClick={copyInvite}
                    title="Copy Invite Code"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition"
                  >
                    <Clipboard className="w-4 h-4" />
                    <span>Copy Invite</span>
                  </button>
                )}
              </div>
            </div>

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="absolute bottom-0 text-sm text-gray-500 mt-1">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers[0]}, ${typingUsers[1]} and ${
                      typingUsers.length - 2
                    } others are typing...`}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col">
            <div className="space-y-4 grow">
              {messages.map((msg) => {
                const isMine = msg.user.username === currentUser;
                const isSystem = msg.user.username === "System";

                return (
                  <div
                    key={msg._id}
                    className={`flex gap-3 mb-2 ${
                      isSystem
                        ? "justify-center"
                        : isMine
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {!isMine && !isSystem && (
                      <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold">
                        <User className="w-5 h-5" />
                      </span>
                    )}

                    {isSystem ? (
                      <span className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
                        <Zap className="w-3 h-3 text-gray-400" />
                        {msg.text}
                      </span>
                    ) : (
                      <div
                        className={`flex flex-col max-w-[70%] ${
                          isMine ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="text-sm font-bold text-gray-900 mb-1">
                          {msg.user.username}
                        </span>

                        <div
                          className={`relative px-4 py-3 rounded-lg shadow-md border whitespace-pre-wrap flex flex-row items-baseline ${
                            isMine
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-800 border-gray-200"
                          } ${msg.isPending ? "opacity-70" : ""}`}
                          style={{ wordBreak: "break-word" }}
                        >
                          <p className="wrap-break-words">{msg.text}</p>
                          <span
                            className={`text-xs ml-2 shrink-0 ${
                              isMine ? "text-indigo-200" : "text-gray-400"
                            }`}
                          >
                            {msg.isPending ? (
                              <Clock className="w-3 h-3 animate-spin" />
                            ) : (
                              format(new Date(msg.timestamp), "HH:mm")
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t">
            <form onSubmit={sendMessage} className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={handleInputChange}
                className="grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-3.5 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomPage;