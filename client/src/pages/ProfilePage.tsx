import React, { useState, useEffect, useRef, Fragment } from "react";
import { getErrorMessage } from "../utils/errorUtils";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";
import { MessageSquareText, User, Lock, Eye, EyeOff, Loader2, Save, ArrowLeft, Mail, Camera, X, ShieldCheck } from "lucide-react";

const addCacheBuster = (url: string) => { if (!url) return ""; const sep = url.includes("?") ? "&" : "?"; return `${url}${sep}_t=${Date.now()}`; };

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username") || "User";
  const API_URL = import.meta.env.VITE_API_URL;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsFetchingData(true);
      try {
        const { data } = await axios.get(`${API_URL}/api/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        setName(data.name || ""); setEmail(data.email || ""); setAvatarUrl(addCacheBuster(data.avatarUrl || ""));
      } catch { toast.error("Could not load profile."); }
      finally { setIsFetchingData(false); }
    };
    fetchUserProfile();
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileLoading(true);
    const id = toast.loading("Saving profile...");
    let uploadedAvatarUrl = avatarUrl.split("?")[0];
    if (selectedFile) {
      toast.loading("Uploading image...", { id });
      const fd = new FormData(); fd.append("avatar", selectedFile);
      try { const { data } = await axios.post(`${API_URL}/api/users/upload-avatar`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }); uploadedAvatarUrl = data.url; setSelectedFile(null); setPreviewUrl(null); }
      catch { toast.error("Image upload failed.", { id }); setProfileLoading(false); return; }
    }
    try {
      const { data: saved } = await axios.put(`${API_URL}/api/users/profile`, { name, email, avatarUrl: uploadedAvatarUrl }, { headers: { Authorization: `Bearer ${token}` } });
      setName(saved.name); setEmail(saved.email); setAvatarUrl(addCacheBuster(saved.avatarUrl));
      toast.success("Profile updated!", { id });
    } catch (err: any) { toast.error(getErrorMessage(err, "Failed to update."), { id }); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) { toast.error("Fill all fields."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match."); return; }
    setPasswordLoading(true);
    const id = toast.loading("Updating password...");
    try {
      await axios.post(`${API_URL}/api/auth/update-password`, { oldPassword, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Password updated!", { id }); setOldPassword(""); setNewPassword(""); setConfirmPassword(""); setIsPasswordModalOpen(false);
    } catch (err: any) { toast.error(getErrorMessage(err, "Failed."), { id }); }
    finally { setPasswordLoading(false); }
  };

  const displayAvatar = previewUrl || avatarUrl || "https://api.dicebear.com/7.x/bottts/svg";

  const inputStyle = { background: 'var(--dc-bg-tertiary)', borderRadius: '4px', border: 'none', padding: '10px 12px', color: 'var(--dc-text-normal)', width: '100%', fontSize: '15px', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', color: 'var(--dc-text-muted)', marginBottom: '8px', display: 'block' };

  return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />
      <div className="dc-page">
        {/* Header */}
        <header style={{ height: '48px', borderBottom: '1px solid var(--dc-border-light)', background: 'var(--dc-bg-secondary)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '12px' }}>
          <button onClick={() => navigate('/lobby')} className="dc-btn dc-btn-ghost" style={{ padding: '6px', borderRadius: '4px', gap: '6px', fontSize: '14px' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div style={{ height: '20px', width: '1px', background: 'var(--dc-border)' }} />
          <MessageSquareText className="w-5 h-5" style={{ color: 'var(--dc-accent)' }} />
          <span style={{ fontWeight: 700, color: 'var(--dc-text-white)', fontSize: '15px' }}>Chatterbox</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, fontSize: '14px', color: 'var(--dc-text-muted)' }}>Account Settings</span>
        </header>

        <div style={{ maxWidth: '740px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isFetchingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '240px' }}>
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--dc-accent)' }} />
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Banner */}
                <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--dc-accent) 0%, #7983F5 100%)' }} />
                <div style={{ padding: '0 24px 24px', position: 'relative' }}>
                  {/* Avatar */}
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: '-36px', marginBottom: '12px' }}>
                    <div onClick={() => fileInputRef.current?.click()} style={{ width: '72px', height: '72px', borderRadius: '50%', border: '4px solid var(--dc-bg-secondary)', overflow: 'hidden', cursor: 'pointer', position: 'relative' }} className="group">
                      <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'var(--dc-bg-active)' }} onError={e => (e.currentTarget.src = 'https://api.dicebear.com/7.x/bottts/svg')} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
                  </div>

                  <form onSubmit={handleProfileSave}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={labelStyle}>Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your display name" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Username</label>
                        <input value={username} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--dc-border)', paddingTop: '16px' }}>
                      <button type="submit" disabled={profileLoading} className="dc-btn dc-btn-primary" style={{ gap: '8px' }}>
                        {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {profileLoading ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Security Card */}
              <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--dc-border)', paddingBottom: '16px' }}>
                  <ShieldCheck className="w-5 h-5" style={{ color: 'var(--dc-accent)' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--dc-text-white)' }}>Security</h2>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--dc-text-normal)', marginBottom: '4px' }}>Password</div>
                    <div style={{ fontSize: '13px', color: 'var(--dc-text-muted)' }}>Update your password to keep your account secure.</div>
                  </div>
                  <button onClick={() => setIsPasswordModalOpen(true)} className="dc-btn dc-btn-secondary" style={{ flexShrink: 0 }}>
                    Change Password
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password Modal */}
      <Transition appear show={isPasswordModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsPasswordModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
          </Transition.Child>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="dc-modal" style={{ maxWidth: '440px', width: '100%' }}>
                <button onClick={() => setIsPasswordModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)' }}><X className="w-5 h-5" /></button>
                <Dialog.Title style={{ fontSize: '20px', fontWeight: 700, color: 'var(--dc-text-white)', marginBottom: '20px' }}>Update Password</Dialog.Title>
                <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { id: 'old', label: 'Current Password', val: oldPassword, set: setOldPassword, show: showPasswords.old, field: 'old' as const },
                    { id: 'new', label: 'New Password', val: newPassword, set: setNewPassword, show: showPasswords.new, field: 'new' as const },
                    { id: 'confirm', label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, show: showPasswords.confirm, field: 'confirm' as const },
                  ].map(f => (
                    <div key={f.id}>
                      <label style={labelStyle}>{f.label}</label>
                      <div style={{ position: 'relative' }}>
                        <Lock className="w-4 h-4" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dc-text-faint)' }} />
                        <input type={f.show ? 'text' : 'password'} value={f.val} onChange={e => f.set(e.target.value)} required style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }} placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPasswords(p => ({ ...p, [f.field]: !p[f.field] }))} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)', padding: 0 }}>
                          {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="dc-btn dc-btn-secondary">Cancel</button>
                    <button type="submit" disabled={passwordLoading} className="dc-btn dc-btn-primary">
                      {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {passwordLoading ? "Saving..." : "Save Password"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ProfilePage;