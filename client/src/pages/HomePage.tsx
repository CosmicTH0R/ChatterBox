import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareText, ArrowRight, Zap, ShieldCheck, Users, Hash, Headphones } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="dc-page flex flex-col" style={{ background: 'linear-gradient(135deg, #1E1F22 0%, #2B2D31 50%, #313338 100%)' }}>

      {/* Nav */}
      <header style={{ borderBottom: '1px solid var(--dc-border)' }} className="px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div style={{ background: 'var(--dc-accent)', borderRadius: '8px' }} className="w-9 h-9 flex items-center justify-center">
            <MessageSquareText className="w-5 h-5 text-white" />
          </div>
          <span style={{ color: 'var(--dc-text-white)', fontWeight: 700, fontSize: '20px' }}>Chatterbox</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="dc-btn dc-btn-ghost text-sm">Log In</Link>
          <Link to="/register" className="dc-btn dc-btn-primary text-sm">Sign Up</Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center text-center flex-1 px-6 py-24">
        <div style={{ background: 'var(--dc-accent)', borderRadius: '99px', padding: '4px 16px', fontSize: '12px', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '24px' }}>
          Now in Public Beta
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.05, color: 'var(--dc-text-white)', maxWidth: '800px', marginBottom: '24px' }}>
          Your community,<br />
          <span style={{ color: 'var(--dc-accent)' }}>your space.</span>
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--dc-text-muted)', maxWidth: '520px', lineHeight: 1.6, marginBottom: '40px' }}>
          Chatterbox is where groups of friends and communities come together to hang out and talk. Chat via text, share files, and build real connections.
        </p>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <Link to="/register" className="dc-btn dc-btn-primary" style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 700, borderRadius: '28px' }}>
            Get Started — it's free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/login" className="dc-btn dc-btn-secondary" style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 700, borderRadius: '28px' }}>
            Login
          </Link>
        </div>
      </main>

      {/* Features */}
      <section style={{ background: 'var(--dc-bg-secondary)', borderTop: '1px solid var(--dc-border)' }} className="py-20 px-6">
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--dc-text-white)', textAlign: 'center', marginBottom: '60px' }}>
            Everything you need to connect
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="w-7 h-7" />, title: 'Real-Time Messaging', desc: 'Instant message delivery with typing indicators, reactions, and media sharing — powered by WebSockets.' },
              { icon: <ShieldCheck className="w-7 h-7" />, title: 'Encrypted & Secure', desc: 'Private invite-only rooms, JWT authentication, and strict content policies keep your community safe.' },
              { icon: <Hash className="w-7 h-7" />, title: 'Organized Channels', desc: 'Create public rooms for your community or private channels for close friends with invite codes.' },
              { icon: <Users className="w-7 h-7" />, title: 'Friend System', desc: 'Add friends, see who\'s online in real time, and jump straight into a direct message with one click.' },
              { icon: <MessageSquareText className="w-7 h-7" />, title: 'Direct Messages', desc: 'One-on-one private conversations with your friends, accessible any time from your conversations list.' },
              { icon: <Headphones className="w-7 h-7" />, title: 'File Sharing', desc: 'Drag and drop images, videos, and files directly into chat. Stored securely via Cloudinary CDN.' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'var(--dc-bg-primary)', borderRadius: '8px', padding: '28px', border: '1px solid var(--dc-border)' }}>
                <div style={{ color: 'var(--dc-accent)', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dc-text-white)', marginBottom: '8px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--dc-text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer style={{ background: 'var(--dc-bg-tertiary)', borderTop: '1px solid var(--dc-border)', padding: '48px 24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--dc-text-white)', marginBottom: '12px' }}>
          Ready to start chatting?
        </h3>
        <p style={{ color: 'var(--dc-text-muted)', marginBottom: '28px' }}>Join thousands of communities on Chatterbox.</p>
        <Link to="/register" className="dc-btn dc-btn-primary" style={{ padding: '14px 32px', fontSize: '16px', fontWeight: 700, borderRadius: '28px' }}>
          Create an Account
        </Link>
        <p style={{ marginTop: '40px', color: 'var(--dc-text-faint)', fontSize: '13px' }}>
          © {new Date().getFullYear()} Chatterbox. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;