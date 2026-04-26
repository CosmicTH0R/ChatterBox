import React, { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Users, UserPlus, Mail, Loader2, MessageSquareText, UserCheck, UserX, Trash2, X, AlertTriangle, Hash } from "lucide-react";
import { Dialog, Transition } from "@headlessui/react";
import UserInfoModal from "../components/UserInfoModal";

interface Friend { _id: string; username: string; name?: string; avatarUrl?: string; }
interface Request { _id: string; username: string; name?: string; avatarUrl?: string; }
const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [activeTab, setActiveTab] = useState("all");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Request[]>([]);
  const [addUsername, setAddUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/friends/all`, { headers: { Authorization: `Bearer ${token}` } });
      setFriends(data.friends || []);
      setReceivedRequests(data.receivedRequests || []);
    } catch { toast.error("Could not load friends."); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (!token) { navigate("/login"); return; } fetchData(); }, [token, navigate]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) { toast.error("Enter a username."); return; }
    setIsSubmitting(true);
    const id = toast.loading("Sending request...");
    try {
      const { data } = await axios.post(`${API_URL}/api/friends/send`, { username: addUsername }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(data.message, { id }); setAddUsername(""); fetchData();
    } catch (err: any) { toast.error(err.response?.data?.message || "Failed.", { id }); }
    finally { setIsSubmitting(false); }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const id = toast.loading("Accepting...");
    try { const { data } = await axios.post(`${API_URL}/api/friends/accept`, { requestId }, { headers: { Authorization: `Bearer ${token}` } }); toast.success(data.message, { id }); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || "Failed.", { id }); }
  };

  const handleRejectRequest = async (requestId: string) => {
    const id = toast.loading("Rejecting...");
    try { const { data } = await axios.post(`${API_URL}/api/friends/reject`, { requestId }, { headers: { Authorization: `Bearer ${token}` } }); toast.success(data.message, { id }); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || "Failed.", { id }); }
  };

  const handleRemoveFriend = async () => {
    if (!friendToRemove) return;
    setIsSubmitting(true);
    const id = toast.loading("Removing...");
    try { const { data } = await axios.delete(`${API_URL}/api/friends/${friendToRemove._id}`, { headers: { Authorization: `Bearer ${token}` } }); toast.success(data.message, { id }); setIsModalOpen(false); setFriendToRemove(null); fetchData(); }
    catch (err: any) { toast.error(err.response?.data?.message || "Failed.", { id }); }
    finally { setIsSubmitting(false); }
  };

  const TABS = [
    { id: 'all', label: 'All', icon: <Users className="w-4 h-4" />, badge: friends.length > 0 ? friends.length : null },
    { id: 'pending', label: 'Pending', icon: <Mail className="w-4 h-4" />, badge: receivedRequests.length > 0 ? receivedRequests.length : null },
    { id: 'add', label: 'Add Friend', icon: <UserPlus className="w-4 h-4" />, badge: null },
  ];

  return (
    <div className="dc-layout">
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />

      {/* Sidebar */}
      <div className="dc-sidebar">
        <div className="dc-sidebar-header" onClick={() => navigate("/lobby")}>
          <MessageSquareText className="w-5 h-5 mr-2" style={{ color: 'var(--dc-accent)' }} />Chatterbox
        </div>
        <div style={{ padding: '8px 0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="dc-channel-item" style={{ width: '100%', background: activeTab === t.id ? 'var(--dc-channel-active-bg)' : 'transparent', color: activeTab === t.id ? 'var(--dc-text-white)' : 'var(--dc-channel-text)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', margin: '1px 8px', padding: '6px 8px', boxSizing: 'border-box', width: 'calc(100% - 16px)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{t.icon}{t.label}</span>
              {t.badge && <span className="dc-badge">{t.badge}</span>}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px', marginTop: 'auto' }}>
          <button onClick={() => navigate('/lobby')} className="dc-btn dc-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: '8px', fontSize: '13px' }}>
            <Hash className="w-4 h-4" /> Back to Rooms
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="dc-main">
        <div className="dc-topbar">
          <Users className="w-5 h-5" style={{ color: 'var(--dc-text-muted)' }} />
          <span>Friends</span>
          <div style={{ height: '24px', width: '1px', background: 'var(--dc-border)', margin: '0 8px' }} />
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className="dc-tab" style={{ background: activeTab === t.id ? 'var(--dc-bg-active)' : 'transparent', color: activeTab === t.id ? 'var(--dc-text-white)' : 'var(--dc-text-muted)', border: 'none', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {t.label}{t.badge ? <span className="dc-badge">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--dc-accent)' }} /></div>
          ) : activeTab === 'all' ? (
            friends.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--dc-text-muted)', paddingTop: '60px' }}>
                <Users className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--dc-bg-active)' }} />
                <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dc-text-normal)' }}>No friends yet</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Add a friend to get started.</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '8px' }}>All Friends — {friends.length}</p>
                {friends.map(f => (
                  <div key={f._id} className="dc-user-row" style={{ justifyContent: 'space-between', borderRadius: '8px' }}>
                    <button onClick={() => { setSelectedUserId(f._id); setIsInfoModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1 }}>
                      <img src={f.avatarUrl || DEFAULT_AVATAR} alt="" className="dc-avatar" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dc-text-white)' }}>{f.name || f.username}</div>
                        <div style={{ fontSize: '13px', color: 'var(--dc-text-muted)' }}>@{f.username}</div>
                      </div>
                    </button>
                    <button onClick={e => { e.stopPropagation(); setFriendToRemove(f); setIsModalOpen(true); }} className="dc-btn dc-btn-ghost" style={{ padding: '8px', borderRadius: '50%', color: 'var(--dc-danger)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'pending' ? (
            receivedRequests.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--dc-text-muted)', paddingTop: '60px' }}>
                <Mail className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--dc-bg-active)' }} />
                <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dc-text-normal)' }}>No pending requests</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '8px' }}>Pending — {receivedRequests.length}</p>
                {receivedRequests.map(r => (
                  <div key={r._id} className="dc-user-row" style={{ justifyContent: 'space-between', borderRadius: '8px' }}>
                    <button onClick={() => { setSelectedUserId(r._id); setIsInfoModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1 }}>
                      <img src={r.avatarUrl || DEFAULT_AVATAR} alt="" className="dc-avatar" onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dc-text-white)' }}>{r.name || r.username}</div>
                        <div style={{ fontSize: '13px', color: 'var(--dc-text-muted)' }}>Incoming Friend Request</div>
                      </div>
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleAcceptRequest(r._id)} className="dc-btn" style={{ padding: '8px', borderRadius: '50%', background: 'var(--dc-bg-active)', color: 'var(--dc-success)' }} title="Accept"><UserCheck className="w-4 h-4" /></button>
                      <button onClick={() => handleRejectRequest(r._id)} className="dc-btn" style={{ padding: '8px', borderRadius: '50%', background: 'var(--dc-bg-active)', color: 'var(--dc-danger)' }} title="Reject"><UserX className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ maxWidth: '480px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--dc-text-white)', marginBottom: '4px' }}>Add Friend</h3>
              <p style={{ fontSize: '14px', color: 'var(--dc-text-muted)', marginBottom: '16px' }}>You can add friends with their Chatterbox username.</p>
              <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '8px', background: 'var(--dc-bg-tertiary)', borderRadius: '8px', padding: '4px', border: '1px solid var(--dc-border)' }}>
                <input value={addUsername} onChange={e => setAddUsername(e.target.value)} placeholder="Enter a username" className="dc-input" style={{ background: 'transparent', flex: 1, border: 'none', boxShadow: 'none' }} />
                <button type="submit" disabled={isSubmitting} className="dc-btn dc-btn-primary" style={{ flexShrink: 0 }}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Request'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Remove Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
          </Transition.Child>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dc-modal" style={{ maxWidth: '420px', width: '100%' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)' }}><X className="w-5 h-5" /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <AlertTriangle className="w-6 h-6" style={{ color: 'var(--dc-danger)', flexShrink: 0 }} />
                  <Dialog.Title style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dc-text-white)' }}>Remove Friend</Dialog.Title>
                </div>
                <p style={{ color: 'var(--dc-text-muted)', fontSize: '14px', marginBottom: '20px' }}>Are you sure you want to remove <strong style={{ color: 'var(--dc-text-normal)' }}>{friendToRemove?.username}</strong>?</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button onClick={() => setIsModalOpen(false)} className="dc-btn dc-btn-secondary">Cancel</button>
                  <button onClick={handleRemoveFriend} disabled={isSubmitting} className="dc-btn dc-btn-danger">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <UserInfoModal isOpen={isInfoModalOpen} onClose={() => { setIsInfoModalOpen(false); setSelectedUserId(null); }} userId={selectedUserId} onStatusChange={fetchData} />
    </div>
  );
};

export default FriendsPage;