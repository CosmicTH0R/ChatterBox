import React, { useEffect, useState, Fragment } from "react";
import { getErrorMessage } from "../utils/errorUtils";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Transition, Menu } from "@headlessui/react";
import { MessageSquareText, Hash, Plus, Loader2, Users, LogOut, ChevronRight, Trash2, AlertTriangle, X, Lock, Key, Clipboard, Check, List, PlusSquare, User, ChevronDown, MessageSquare } from "lucide-react";

interface Room { _id: string; name: string; creator?: string | { _id: string; username: string }; }
interface MyRoom { _id: string; name: string; inviteCode: string; creator: { _id: string; username: string }; }

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const currentUserId = localStorage.getItem("userId");
  const API_URL = import.meta.env.VITE_API_URL;
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | MyRoom | null>(null);
  const [activeTab, setActiveTab] = useState("public");
  const [userAvatar, setUserAvatar] = useState("");
  const [userName, setUserName] = useState("User");
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [publicRoomName, setPublicRoomName] = useState("");
  const [publicLoading, setPublicLoading] = useState(false);
  const [privateTab, setPrivateTab] = useState("myrooms");
  const [myRooms, setMyRooms] = useState<MyRoom[]>([]);
  const [myRoomsLoading, setMyRoomsLoading] = useState(true);
  const [privateRoomName, setPrivateRoomName] = useState("");
  const [joinRoomName, setJoinRoomName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [privateCreateLoading, setPrivateCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchPublicRooms = async () => {
    try { const res = await axios.get(`${API_URL}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } }); setPublicRooms(res.data); }
    catch { setError("Unable to load public rooms."); }
  };

  const fetchMyRooms = async () => {
    setMyRoomsLoading(true);
    try { const res = await axios.get(`${API_URL}/api/rooms/myrooms`, { headers: { Authorization: `Bearer ${token}` } }); setMyRooms(res.data); }
    catch { console.error("Error fetching my rooms"); }
    finally { setMyRoomsLoading(false); }
  };

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const busted = res.data.avatarUrl ? `${res.data.avatarUrl}${res.data.avatarUrl.includes("?") ? "&" : "?"}_t=${Date.now()}` : "";
        setUserAvatar(busted); setUserName(res.data.name || res.data.username || "User");
      } catch { console.log("Profile fetch failed"); }
    };
    fetchProfile();
    if (activeTab === "public") fetchPublicRooms(); else fetchMyRooms();
  }, [token, navigate, API_URL, activeTab]);

  const handleCreatePublicRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!publicRoomName.trim()) { setError("Room name cannot be empty."); return; }
    setPublicLoading(true); setError("");
    try { await axios.post(`${API_URL}/api/rooms`, { name: publicRoomName, isPrivate: false }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }); setPublicRoomName(""); await fetchPublicRooms(); }
    catch (err: any) { setError(getErrorMessage(err, "Failed to create room.")); }
    finally { setPublicLoading(false); }
  };

  const handleCreatePrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!privateRoomName.trim()) { setError("Room name cannot be empty."); return; }
    setPrivateCreateLoading(true); setError(""); setNewInviteCode(null);
    try { const res = await axios.post(`${API_URL}/api/rooms`, { name: privateRoomName, isPrivate: true }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }); setPrivateRoomName(""); setNewInviteCode(res.data.room.inviteCode); await fetchMyRooms(); }
    catch (err: any) { setError(getErrorMessage(err, "Failed to create private room.")); }
    finally { setPrivateCreateLoading(false); }
  };

  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault(); if (!joinRoomName.trim() || !inviteCode.trim()) { setError("Room name and invite code required."); return; }
    setJoinLoading(true); setError("");
    try { const res = await axios.post(`${API_URL}/api/rooms/join`, { name: joinRoomName, inviteCode }, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }); await fetchMyRooms(); navigate(`/room/${res.data._id}`); }
    catch (err: any) { setError(getErrorMessage(err, "Invalid name or invite code.")); }
    finally { setJoinLoading(false); }
  };

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;
    setDeletingId(roomToDelete._id); setError(""); setIsModalOpen(false);
    try { await axios.delete(`${API_URL}/api/rooms/${roomToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } }); setPublicRooms(p => p.filter(r => r._id !== roomToDelete._id)); setMyRooms(p => p.filter(r => r._id !== roomToDelete._id)); }
    catch (err: any) { setError(getErrorMessage(err, "Failed to delete room.")); }
    finally { setDeletingId(null); setRoomToDelete(null); }
  };

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("username"); localStorage.removeItem("userId"); navigate("/login"); };
  const copyInvite = (code: string) => { navigator.clipboard.writeText(code); setCopySuccess(code); setTimeout(() => setCopySuccess(null), 2000); };
  const switchTab = (tab: string) => { setError(""); setNewInviteCode(null); setActiveTab(tab); };

  const inputStyle = { background: 'var(--dc-bg-tertiary)', border: 'none', borderRadius: '4px', padding: '10px 12px', color: 'var(--dc-text-normal)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '100%' };

  return (
    <div className="dc-layout">
      {/* Sidebar */}
      <div className="dc-sidebar">
        {/* Header */}
        <div className="dc-sidebar-header">
          <MessageSquareText className="w-5 h-5 mr-2" style={{ color: 'var(--dc-accent)' }} />
          Chatterbox
        </div>

        {/* Nav links */}
        <div style={{ padding: '8px 0', flex: 1 }}>
          <div className="dc-sidebar-section-label">Navigation</div>
          {[
            { label: 'Friends', icon: <Users className="w-4 h-4" />, onClick: () => navigate('/friends') },
            { label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, onClick: () => navigate('/conversations') },
          ].map((item, i) => (
            <button key={i} onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', margin: '1px 8px', borderRadius: '4px', width: 'calc(100% - 16px)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-channel-text)', fontSize: '14px', fontWeight: 500, transition: 'background 0.1s, color 0.1s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--dc-channel-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-normal)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--dc-channel-text)'; }}>
              {item.icon}{item.label}
            </button>
          ))}

          <div className="dc-sidebar-section-label" style={{ marginTop: '8px' }}>
            Rooms
            <button onClick={() => { switchTab('public'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)', padding: 0 }}><Plus className="w-4 h-4" /></button>
          </div>
          {[
            { id: 'public', label: 'Public Rooms', icon: <Hash className="w-4 h-4" /> },
            { id: 'private', label: 'Private Rooms', icon: <Lock className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', margin: '1px 8px', borderRadius: '4px', width: 'calc(100% - 16px)', background: activeTab === t.id ? 'var(--dc-channel-active-bg)' : 'none', border: 'none', cursor: 'pointer', color: activeTab === t.id ? 'var(--dc-text-white)' : 'var(--dc-channel-text)', fontSize: '14px', fontWeight: activeTab === t.id ? 600 : 500 }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* User Panel */}
        <div className="dc-user-panel">
          <img src={userAvatar || "https://api.dicebear.com/7.x/bottts/svg"} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: 'var(--dc-bg-active)', flexShrink: 0 }} onError={e => (e.currentTarget.src = "https://api.dicebear.com/7.x/bottts/svg")} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dc-text-white)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--dc-text-muted)' }} title="Settings"><User className="w-4 h-4" /></button>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', color: 'var(--dc-text-muted)' }} title="Log Out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dc-main">
        {/* Top bar */}
        <div className="dc-topbar">
          {activeTab === 'public' ? <Hash className="w-5 h-5" style={{ color: 'var(--dc-text-muted)' }} /> : <Lock className="w-5 h-5" style={{ color: 'var(--dc-text-muted)' }} />}
          <span>{activeTab === 'public' ? 'Public Rooms' : 'Private Rooms'}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {error && <div style={{ background: 'rgba(242,63,67,0.15)', border: '1px solid var(--dc-danger)', color: 'var(--dc-danger)', padding: '10px 14px', borderRadius: '4px', fontSize: '14px', marginBottom: '16px' }}>{error}</div>}

          {/* PUBLIC TAB */}
          {activeTab === 'public' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Create */}
              <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '12px' }}>Create a Room</h3>
                <form onSubmit={handleCreatePublicRoom} style={{ display: 'flex', gap: '8px' }}>
                  <input value={publicRoomName} onChange={e => setPublicRoomName(e.target.value)} placeholder="new-room-name" style={{ ...inputStyle, flex: 1 }} />
                  <button type="submit" disabled={publicLoading} className="dc-btn dc-btn-primary" style={{ flexShrink: 0, gap: '6px' }}>
                    {publicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create
                  </button>
                </form>
              </div>

              {/* List */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '8px' }}>Available — {publicRooms.length}</div>
                {publicRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'var(--dc-text-muted)' }}><Hash className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--dc-bg-active)' }} /><p>No public rooms yet. Create one above!</p></div>
                ) : publicRooms.map(room => {
                  const creatorId = room.creator ? (typeof room.creator === 'string' ? room.creator : room.creator._id) : null;
                  return (
                    <div key={room._id} style={{ display: 'flex', alignItems: 'center', padding: '2px 0' }}>
                      <Link to={`/room/${room._id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, padding: '8px 10px', borderRadius: '4px', color: 'var(--dc-channel-text)', textDecoration: 'none', transition: 'background 0.1s, color 0.1s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--dc-channel-hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-normal)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--dc-channel-text)'; }}>
                        <Hash className="w-4 h-4 flex-shrink-0" />
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>{room.name}</span>
                        <ChevronRight className="w-4 h-4 ml-auto" style={{ opacity: 0.4 }} />
                      </Link>
                      {creatorId === currentUserId && (
                        <button onClick={() => { setRoomToDelete(room); setIsModalOpen(true); }} disabled={deletingId === room._id} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: 'var(--dc-text-faint)', marginLeft: '4px' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-danger)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-faint)'}>
                          {deletingId === room._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRIVATE TAB */}
          {activeTab === 'private' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--dc-bg-secondary)', padding: '4px', borderRadius: '6px', width: 'fit-content' }}>
                {[{ id: 'myrooms', label: 'My Rooms', icon: <List className="w-4 h-4" /> }, { id: 'create', label: 'Create / Join', icon: <PlusSquare className="w-4 h-4" /> }].map(t => (
                  <button key={t.id} onClick={() => setPrivateTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '4px', background: privateTab === t.id ? 'var(--dc-bg-active)' : 'transparent', border: 'none', cursor: 'pointer', color: privateTab === t.id ? 'var(--dc-text-white)' : 'var(--dc-text-muted)', fontSize: '14px', fontWeight: 500, transition: 'all 0.1s' }}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>

              {privateTab === 'myrooms' && (
                myRoomsLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--dc-accent)' }} /></div>
                : myRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'var(--dc-text-muted)' }}><Lock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--dc-bg-active)' }} /><p>No private rooms yet.</p></div>
                ) : myRooms.map(room => (
                  <div key={room._id} style={{ display: 'flex', alignItems: 'center', background: 'var(--dc-bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <Link to={`/room/${room._id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, padding: '12px 16px', color: 'var(--dc-text-normal)', textDecoration: 'none' }}>
                      <Lock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--dc-text-muted)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>{room.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--dc-text-muted)' }}>by {room.creator.username}{room.creator._id === currentUserId ? ' (you)' : ''}</div>
                      </div>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--dc-text-muted)', background: 'var(--dc-bg-tertiary)', padding: '4px 8px', borderRadius: '4px' }}>{room.inviteCode}</span>
                      <button onClick={() => copyInvite(room.inviteCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: copySuccess === room.inviteCode ? 'var(--dc-success)' : 'var(--dc-text-muted)' }}>
                        {copySuccess === room.inviteCode ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      </button>
                      {room.creator._id === currentUserId && (
                        <button onClick={() => { setRoomToDelete(room); setIsModalOpen(true); }} disabled={deletingId === room._id} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: 'var(--dc-text-faint)' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-danger)'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-faint)'}>
                          {deletingId === room._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}

              {privateTab === 'create' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Create */}
                  <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', padding: '20px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '12px' }}>Create Private Room</h3>
                    <form onSubmit={handleCreatePrivateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input value={privateRoomName} onChange={e => setPrivateRoomName(e.target.value)} placeholder="secret-room-name" style={inputStyle} />
                      <button type="submit" disabled={privateCreateLoading} className="dc-btn dc-btn-primary" style={{ gap: '6px' }}>
                        {privateCreateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Create
                      </button>
                    </form>
                    {newInviteCode && (
                      <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(35,165,90,0.15)', border: '1px solid var(--dc-success)', borderRadius: '4px' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dc-success)', marginBottom: '8px' }}>Room created! Share this code:</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: 'var(--dc-text-white)', flex: 1 }}>{newInviteCode}</span>
                          <button onClick={() => copyInvite(newInviteCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copySuccess === newInviteCode ? 'var(--dc-success)' : 'var(--dc-text-muted)', padding: '4px' }}>
                            {copySuccess === newInviteCode ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Join */}
                  <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', padding: '20px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '12px' }}>Join Private Room</h3>
                    <form onSubmit={handleJoinPrivateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input value={joinRoomName} onChange={e => setJoinRoomName(e.target.value)} placeholder="Room name" style={inputStyle} />
                      <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Invite code" style={inputStyle} />
                      <button type="submit" disabled={joinLoading} className="dc-btn dc-btn-primary" style={{ gap: '6px', background: 'var(--dc-success)' }}>
                        {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />} Join Room
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {isModalOpen && roomToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setIsModalOpen(false)}>
          <div className="dc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)' }}><X className="w-5 h-5" /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: 'var(--dc-danger)', flexShrink: 0 }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dc-text-white)' }}>Delete Room</h3>
            </div>
            <p style={{ color: 'var(--dc-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--dc-text-normal)' }}>{roomToDelete.name}</strong>? All messages will be permanently deleted.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setIsModalOpen(false)} className="dc-btn dc-btn-secondary">Cancel</button>
              <button onClick={handleConfirmDelete} disabled={!!deletingId} className="dc-btn dc-btn-danger">
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;