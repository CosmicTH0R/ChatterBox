import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquareText, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Users 
} from 'lucide-react';

/**
 * The main landing page for the application.
 * Features a header, hero section, features, and footer.
 * Uses <Link> components from react-router-dom for navigation.
 */
const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-inter bg-gray-50">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full z-10 p-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageSquareText className="w-8 h-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">Chatterbox</span>
        </div>
        <div className="space-x-4">
          <Link
            to="/login"
            className="px-5 py-2 text-sm font-semibold text-indigo-600 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flexgrow flex flex-col justify-center items-center text-center p-6 pt-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            Connect Instantly.
            <br />
            Chat Securely.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl mx-auto">
            Welcome to Chatterbox, the simple, fast, and stylish platform for all your real-time messaging needs.
          </p>
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition-all mx-auto"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why you'll love Chatterbox</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
              <Zap className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Blazing Fast</h3>
              <p className="text-gray-600">Our real-time infrastructure ensures your messages are delivered instantly, every time.</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
              <ShieldCheck className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-gray-600">With end-to-end encryption, your conversations stay just between you.</p>
            </div>
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
              <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Public Lobbies</h3>
              <p className="text-gray-600">Jump into public chat rooms and meet new people with shared interests.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-gray-900 text-gray-400 text-center">
        <p>&copy; {new Date().getFullYear()} Chatterbox. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
