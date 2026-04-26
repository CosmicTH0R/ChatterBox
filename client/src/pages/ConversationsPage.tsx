import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Loader2, MessageSquare } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

interface UserInfo { _id: string; username: string; name?: string; avatarUrl?: string; }
interface LastMessage { _id: string; text: string; timestamp: string; user: string; }
interface Conversation { lastMessage: LastMessage; withUser: UserInfo; }

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const ConversationsPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/api/friends/conversations`, { headers: { Authorization: `Bearer ${token}` } });
        setConversations(data || []);
      } catch { toast.error("Could not load conversations."); }
      finally { setIsLoading(false); }
    };
    fetch();
  }, [token, navigate, API_URL]);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Yesterday";
    return format(d, "dd/MM/yy");
  };

  return (
    <div className="dc-layout">
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />

      {/* Sidebar */}
      <div className="dc-sidebar">
        <div className="dc-sidebar-header" onClick={() => navigate("/lobby")}>
          <MessageSquare className="w-5 h-5 mr-2" style={{ color: 'var(--dc-accent)' }} />
          Direct Messages
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--dc-text-muted)' }} /></div>
          ) : conversations.length === 0 ? (
            <p style={{ padding: '16px', color: 'var(--dc-text-faint)', fontSize: '14px', textAlign: 'center' }}>No conversations yet</p>
          ) : conversations.map(c => (
            <Link key={c.withUser._id} to={`/dm/${c.withUser._id}`} className="dc-channel-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', margin: '1px 8px', borderRadius: '4px', textDecoration: 'none', color: 'var(--dc-text-muted)' }}>
              <img src={c.withUser.avatarUrl || DEFAULT_AVATAR} alt="" className="dc-avatar-sm" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--dc-text-normal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.withUser.name || c.withUser.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--dc-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage.user === currentUserId ? "You: " : ""}{c.lastMessage.text}</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--dc-text-faint)', flexShrink: 0 }}>{formatTimestamp(c.lastMessage.timestamp)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="dc-main">
        <div className="dc-topbar">
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--dc-text-muted)' }} />
          <span>Messages</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--dc-text-muted)', gap: '12px' }}>
          <MessageSquare className="w-16 h-16" style={{ color: 'var(--dc-bg-active)' }} />
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dc-text-normal)' }}>Select a conversation</p>
          <p style={{ fontSize: '14px', color: 'var(--dc-text-muted)' }}>Choose a conversation from the sidebar to start chatting.</p>
          <button onClick={() => navigate('/friends')} className="dc-btn dc-btn-primary" style={{ marginTop: '8px' }}>Add Friends</button>
        </div>
      </div>
    </div>
  );
};

export default ConversationsPage;