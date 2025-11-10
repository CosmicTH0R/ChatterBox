import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  MessageSquareText,
  MessageSquare,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

// --- INTERFACES ---
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface LastMessage {
  _id: string;
  text: string;
  timestamp: string;
  user: string; // User ID of the sender
}

interface Conversation {
  lastMessage: LastMessage;
  withUser: UserInfo;
}

// --- DEFAULT AVATAR ---
const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // --- STATE ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. DATA FETCHING (GET /api/friends/conversations) ---
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchConversations = async () => {
      try {
        const { data } = await axios.get(
          `${API_URL}/api/friends/conversations`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setConversations(data || []);
      } catch (err) {
        console.error("Failed to fetch conversations", err);
        toast.error("Could not load your conversations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [token, navigate, API_URL]);

  // --- 2. HELPER FUNCTIONS ---
  
  // Formats the timestamp for the conversation list
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "HH:mm"); // e.g., "14:30"
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    // If it's within the last week
    if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return format(date, "EEEE"); // e.g., "Tuesday"
    }
    return format(date, "dd/MM/yyyy"); // e.g., "25/10/2025"
  };

  // --- 3. RENDER ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex-grow flex justify-center items-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center h-full p-6 text-center">
          <MessageSquare className="w-16 h-16 text-gray-300" />
          <h3 className="mt-4 text-xl font-semibold text-gray-800">No conversations yet</h3>
          <p className="mt-2 text-gray-500">
            Start a new conversation by sending a message to one of your friends.
          </p>
        </div>
      );
    }

    return (
      <ul className="divide-y divide-gray-200">
        {conversations.map((convo) => (
          <li key={convo.withUser._id}>
            <Link
              to={`/dm/${convo.withUser._id}`}
              className="flex items-center p-4 sm:p-6 hover:bg-gray-50 transition-colors"
            >
              <img
                src={convo.withUser.avatarUrl || DEFAULT_AVATAR}
                alt={convo.withUser.username}
                className="w-12 h-12 rounded-full bg-gray-200 object-cover"
                onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
              />
              <div className="ml-4 grow min-w-0">
                <span className="font-semibold text-gray-800">
                  {convo.withUser.name || convo.withUser.username}
                </span>
                <p className="text-sm text-gray-500 truncate">
                  {convo.lastMessage.user === currentUserId ? "You: " : ""}
                  {convo.lastMessage.text}
                </p>
              </div>
              <time className="text-xs text-gray-400 shrink-0 ml-4">
                {formatTimestamp(convo.lastMessage.timestamp)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-100 font-inter flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
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

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grow flex flex-col w-full">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-900">
              Conversations
            </h2>
          </div>
          
          {/* White Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col grow">
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default ConversationsPage;