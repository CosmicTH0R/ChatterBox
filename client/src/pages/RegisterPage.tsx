import React, { useState } from "react";
import { getErrorMessage } from "../utils/errorUtils";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { MessageSquareText, Lock, Eye, EyeOff, UserPlus } from "lucide-react";

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = toast.loading("Creating account...");
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { username, password });
      toast.success(res.data.message || "Account created!", { id });
      navigate("/lobby");
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Registration failed"), { id });
    }
  };

  return (
    <div className="dc-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #1E1F22 0%, #2B2D31 100%)' }}>
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div style={{ background: 'var(--dc-accent)', borderRadius: '50%', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <MessageSquareText className="w-9 h-9 text-white" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--dc-text-white)', marginBottom: '4px' }}>Create an account</h1>
          <p style={{ color: 'var(--dc-text-muted)', fontSize: '14px', textAlign: 'center' }}>Join thousands of communities on Chatterbox.</p>
        </div>

        {/* Form card */}
        <div style={{ background: 'var(--dc-bg-secondary)', borderRadius: '8px', padding: '32px' }}>
          <form onSubmit={handleRegister} className="flex flex-col gap-5">

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-username" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)' }}>
                Username <span style={{ color: 'var(--dc-danger)' }}>*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                placeholder="e.g. coolgamer99"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="dc-input"
                style={{ background: 'var(--dc-bg-tertiary)', borderRadius: '4px', padding: '10px 12px' }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="reg-password" style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)' }}>
                Password <span style={{ color: 'var(--dc-danger)' }}>*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--dc-text-faint)' }} />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 chars, upper + lower + num + symbol"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="dc-input"
                  style={{ background: 'var(--dc-bg-tertiary)', borderRadius: '4px', padding: '10px 40px 10px 36px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--dc-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--dc-text-faint)' }}>Must include uppercase, lowercase, number, and symbol.</p>
            </div>

            <button type="submit" className="dc-btn dc-btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, borderRadius: '4px', marginTop: '8px' }}>
              <UserPlus className="w-4 h-4" /> Create Account
            </button>

          </form>

          <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--dc-text-muted)' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} style={{ color: 'var(--dc-text-link)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
