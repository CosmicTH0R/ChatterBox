import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  ArrowLeft,
  Send,
  User,
  Zap,
  X,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { Toaster } from "react-hot-toast";

// 1. Updated User interface to include name/avatar, which our DM backend provides
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface Message {
  _id: string | number; // Allow number for temporary pending ID
  text: string;
  timestamp: string;
  user: UserInfo; // Use updated interface
  isPending?: boolean;
}

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const DirectMessagePage: React.FC = () => {
  const navigate = useNavigate();
  // 2. Get friendId from URL params
  const { friendId } = useParams<{ friendId: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");

  // 3. State to hold the friend's info
  const [friendInfo, setFriendInfo] = useState<UserInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const currentUser = localStorage.getItem("username");
  const currentUserId = localStorage.getItem("userId"); // We need this to identify the other user
  const token = localStorage.getItem("token");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    // 4. Typing indicator logic is removed as it was room-specific
  };

  // 5. This effect now fetches and sets friend info from messages
  useEffect(() => {
    // Helper function to find and set friend's info from messages
    const findFriend = (msgs: Message[]) => {
      if (friendInfo) return; // Already set
      const otherUser = msgs.find(
        (m) => m.user._id !== currentUserId
      )?.user;
      if (otherUser) {
        setFriendInfo(otherUser);
      }
    };
    
    if (messages.length > 0) {
      findFriend(messages);
    }

  }, [messages, currentUserId, friendInfo]);


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
    if (!socket || !friendId) return; // Must have socket and friendId

    // 6. Emit 'joinDM' with friendId
    socket.emit("joinDM", { friendId });

    socket.on("loadHistory", (history: Message[]) => {
      setMessages(history);
      // Try to set friend info from history
      if (history.length > 0) {
        const otherUser = history.find(m => m.user._id !== currentUserId)?.user;
        if (otherUser) {
          setFriendInfo(otherUser);
        }
      }
    });

    socket.on("receiveMessage", (pendingMsg: Message) => {
      setMessages((prev) => [...prev, pendingMsg]);
      // Try to set friend info from first incoming message
      if (!friendInfo && pendingMsg.user._id !== currentUserId) {
        setFriendInfo(pendingMsg.user);
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

    socket.on("systemMessage", (msg) => {
      const systemMessage: Message = {
        _id: new Date().getTime(),
        text: msg,
        timestamp: new Date().toISOString(),
        user: { _id: "system", username: "System" },
      };
      setMessages((prev) => [...prev, systemMessage]);
    });
    
    // 7. Removed room-specific listeners: 'updateUserList', 'userTyping', 'roomDetails'

    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    // Cleanup all listeners
    return () => {
      socket.off("loadHistory");
      socket.off("receiveMessage");
      socket.off("messageConfirmed");
      socket.off("systemMessage");
      socket.off("connect_error");
    };
  }, [socket, friendId, currentUser, currentUserId, friendInfo]); // Added dependencies

  // Scroll to bottom effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 8. Send message function updated to use friendId
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket || !friendId) return;
    socket.emit("sendMessage", { friendId, text });
    setText("");
  };

  // 9. Removed 'copyInvite' function

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <Toaster position="top-center" />
      {/* 10. Removed outer container width/height constraints, let it be full screen */}
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* 11. Removed Sidebar Desktop */}
        {/* 12. Removed Mobile Drawer */}

        {/* Main Chat (set to full width) */}
        <div className="flex flex-col grow w-full">
          {/* Header */}
          <div className="relative flex flex-col items-center p-4 border-b bg-white z-10">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate("/conversations")}
                className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline md:ml-2">Back to Conversations</span>
              </button>

              {/* 13. Header now shows friend's name */}
              <h2 className="text-xl font-bold text-gray-900">
                {friendInfo ? friendInfo.name || friendInfo.username : 'Direct Message'}
              </h2>

              {/* 14. Removed Mobile Users Button & Invite Button */}
              {/* Placeholder to keep spacing correct */}
              <div className="hidden md:flex justify-end" style={{ width: "130px" }} />
            </div>

            {/* 15. Removed Typing Indicator */}
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
                    {/* 16. Show avatar for non-system, non-me messages */}
                    {!isMine && !isSystem && (
                      <img
                        src={msg.user.avatarUrl || DEFAULT_AVATAR}
                        alt={msg.user.username}
                        className="shrink-0 w-10 h-10 rounded-full bg-gray-200 object-cover"
                        onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                      />
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
                        {/* 17. Show user's name or username */}
                        <span className="text-sm font-bold text-gray-900 mb-1">
                          {msg.user.name || msg.user.username}
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

export default DirectMessagePage;