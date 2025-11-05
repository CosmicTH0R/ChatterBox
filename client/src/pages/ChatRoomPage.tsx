import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Send, User, Zap } from "lucide-react";
import { format } from "date-fns";

interface Message {
  user: string;
  text: string;
  timestamp?: string;
}

const ChatRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomName } = useParams<{ roomName: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const currentUser = localStorage.getItem("username");

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const newSocket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token },
  });
  setSocket(newSocket);

  return () => {
    newSocket.disconnect(); 
  };
}, [SOCKET_URL]);




  useEffect(() => {
    if (!socket) return;

    socket.emit("joinRoom", { roomName });

    socket.on("systemMessage", (msg) => {
      setMessages((prev) => [...prev, { user: "System", text: msg }]);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.off("systemMessage");
      socket.off("receiveMessage");
      socket.off("connect_error");
    };
  }, [socket, roomName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("sendMessage", { roomName, text });
    setText("");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <div className="flex flex-col w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header (No changes) */}
        <div className="flex items-center justify-between p-4 border-b bg-white z-10">

          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline md:ml-2">Back to Lobby</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold text-gray-900">{roomName}</h2>
          </div>
          <div className="w-28"></div>
        </div>

        {/* Messages */}
        <div className="grow p-4 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isMine = msg.user === currentUser;
              // const isShort = msg.text.length <= 50; // <-- (REMOVED) This logic is unreliable

              return (
                <div
                  key={index}
                  className={`flex gap-3 mb-2 ${
                    msg.user === "System"
                      ? "justify-center"
                      : isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {!isMine && msg.user !== "System" && (
                    <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500 text-white font-semibold">
                      <User className="w-5 h-5" />
                    </span>
                  )}

                  {msg.user === "System" ? (
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
                        {msg.user}
                      </span>

                      {/* === (FIXED) Message bubble === */}
                      <div
                        className={`px-4 py-3 rounded-lg shadow-md border wrap-break-words whitespace-pre-wrap flex flex-row items-baseline ${ // <-- ALWAYS 'flex-row' and 'items-baseline'
                          isMine
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-800 border-gray-200"
                        }`}
                        style={{ wordBreak: "break-word" }}
                      >
                        {/* The text message itself */}
                        <p className="wrap-break-words">{msg.text}</p>

                        {/* === (FIXED) TIMESTAMP LOGIC === */}
                        {/* This now works for all cases: short, long, and wrapped.
                            'ml-2' adds space.
                            'shrink-0' stops the timestamp from being squished.
                        */}
                        {msg.timestamp && (
                          <span
                            className={`text-xs ml-2 shrink-0 ${ // <-- Simplified logic
                              isMine
                                ? "text-indigo-200"
                                : "text-gray-400"
                            }`}
                          >
                            {format(new Date(msg.timestamp), "HH:mm")}
                          </span>
                        )}
                        {/* === END OF FIX === */}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input (No changes) */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={sendMessage} className="flex gap-4 items-center">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
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
  );
};

export default ChatRoomPage;
