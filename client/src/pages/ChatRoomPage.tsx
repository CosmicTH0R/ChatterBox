import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Send, User, Zap } from "lucide-react";

interface Message {
  user: string;
  text: string;
}

const ChatRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Dynamically select backend URL (from .env)
  const SOCKET_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

  // ✅ Connect to backend socket server
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [SOCKET_URL]);

  // ✅ Join room and handle incoming messages
  useEffect(() => {
    if (!socket) return;
    const token = localStorage.getItem("token");

    socket.emit("joinRoom", { roomName, token });

    socket.on("systemMessage", (msg) => {
      setMessages((prev) => [...prev, { user: "System", text: msg }]);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("systemMessage");
      socket.off("receiveMessage");
    };
  }, [socket, roomName]);

  // ✅ Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Send message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("sendMessage", { roomName, text });
    setText("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <div className="flex flex-col w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* --- Header --- */}
        <div className="flex items-center justify-between p-4 border-b bg-white z-10">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>

          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-gray-900">{roomName}</h2>
          </div>

          <div className="w-28"></div>
        </div>

        {/* --- Messages --- */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  msg.user === "System" ? "justify-center" : "items-start"
                }`}
              >
                {msg.user !== "System" && (
                  <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold">
                    <User className="w-5 h-5" />
                  </span>
                )}

                {msg.user === "System" ? (
                  <span className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
                    <Zap className="w-3 h-3 text-gray-400" />
                    {msg.text}
                  </span>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">
                      {msg.user}
                    </span>
                    <div className="mt-1 px-4 py-3 rounded-lg bg-white shadow-md border border-gray-200">
                      <p className="text-gray-800">{msg.text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* --- Message Input --- */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={sendMessage} className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
  );
};

export default ChatRoomPage;
