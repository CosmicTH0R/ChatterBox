import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Send, User, Zap, Users, X } from "lucide-react";
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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const currentUser = localStorage.getItem("username");

  // Individual timeouts for typing users
 const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    if (!socket || !currentUser) return;

    socket.emit("typing", { roomName, user: currentUser });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    setSocket(newSocket);

    return () => {newSocket.disconnect()};
  }, [SOCKET_URL]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("joinRoom", { roomName });

    socket.on("systemMessage", (msg) => {
      setMessages((prev) => [...prev, { user: "System", text: msg }]);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
      // Stop typing for current user when they send a message
      setTypingUsers((prev) => prev.filter((u) => u !== currentUser));
    });

    socket.on("updateUserList", (userList: string[]) => {
      setOnlineUsers(userList);
    });

    socket.on("userTyping", (user: string) => {
      if (!user || user === currentUser) return;

      setTypingUsers((prev) => {
        if (!prev.includes(user)) return [...prev, user];
        return prev;
      });

      if (typingTimeouts.current[user]) clearTimeout(typingTimeouts.current[user]);

      typingTimeouts.current[user] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== user));
        delete typingTimeouts.current[user];
      }, 2000);
    });

    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.off("systemMessage");
      socket.off("receiveMessage");
      socket.off("updateUserList");
      socket.off("userTyping");
      socket.off("connect_error");
    };
  }, [socket, roomName, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket) return;
    socket.emit("sendMessage", { roomName, text });
    setText("");
    // Stop typing for current user immediately
    setTypingUsers((prev) => prev.filter((u) => u !== currentUser));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
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

              <button
                onClick={() => setIsUserListOpen(true)}
                className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
              >
                <Users className="w-5 h-5" />
              </button>
              <div className="hidden md:block w-28"></div>
            </div>

            {/* Typing Indicator (absolute positioning) */}
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
              {messages.map((msg, index) => {
                const isMine = msg.user === currentUser;
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

                        <div
                          className={`px-4 py-3 rounded-lg shadow-md border whitespace-pre-wrap flex flex-row items-baseline ${
                            isMine
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-800 border-gray-200"
                          }`}
                          style={{ wordBreak: "break-word" }}
                        >
                          <p className="wrap-break-words">{msg.text}</p>
                          {msg.timestamp && (
                            <span
                              className={`text-xs ml-2 shrink-0 ${
                                isMine ? "text-indigo-200" : "text-gray-400"
                              }`}
                            >
                              {format(new Date(msg.timestamp), "HH:mm")}
                            </span>
                          )}
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
