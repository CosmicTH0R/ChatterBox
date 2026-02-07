// import React from 'react';
// import { Link } from 'react-router-dom';
// import { 
//   MessageSquareText, 
//   ArrowRight, 
//   Zap, 
//   ShieldCheck, 
//   Users 
// } from 'lucide-react';

// /**
//  * The main landing page for the application.
//  * Features a header, hero section, features, and footer.
//  * Uses <Link> components from react-router-dom for navigation.
//  */
// const HomePage: React.FC = () => {
//   return (
//     <div className="min-h-screen flex flex-col font-inter bg-gray-50">
//       {/* Header */}
//       <header className="absolute top-0 left-0 w-full z-10 p-6 flex justify-between items-center">
//         <div className="flex items-center space-x-2">
//           <MessageSquareText className="w-8 h-8 text-indigo-600" />
//           <span className="text-2xl font-bold text-gray-900">Chatterbox</span>
//         </div>
//         <div className="space-x-4">
//           <Link
//             to="/login"
//             className="px-5 py-2 text-sm font-semibold text-indigo-600 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
//           >
//             Login
//           </Link>
//           <Link
//             to="/register"
//             className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 transition-colors"
//           >
//             Sign Up
//           </Link>
//         </div>
//       </header>

//       {/* Hero Section */}
//       <main className="flexgrow flex flex-col justify-center items-center text-center p-6 pt-32">
//         <div className="max-w-3xl">
//           <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
//             Connect Instantly.
//             <br />
//             Chat Securely.
//           </h1>
//           <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-xl mx-auto">
//             Welcome to Chatterbox, the simple, fast, and stylish platform for all your real-time messaging needs.
//           </p>
//           <Link
//             to="/register"
//             className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-lg hover:bg-indigo-700 transition-all mx-auto"
//           >
//             Get Started Free
//             <ArrowRight className="w-5 h-5" />
//           </Link>
//         </div>
//       </main>

//       {/* Features Section */}
//       <section className="py-20 bg-white">
//         <div className="container mx-auto px-6 max-w-6xl">
//           <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why you'll love Chatterbox</h2>
//           <div className="grid md:grid-cols-3 gap-10">
//             <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
//               <Zap className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
//               <h3 className="text-2xl font-semibold text-gray-900 mb-2">Blazing Fast</h3>
//               <p className="text-gray-600">Our real-time infrastructure ensures your messages are delivered instantly, every time.</p>
//             </div>
//             <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
//               <ShieldCheck className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
//               <h3 className="text-2xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
//               <p className="text-gray-600">With end-to-end encryption, your conversations stay just between you.</p>
//             </div>
//             <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-sm">
//               <Users className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
//               <h3 className="text-2xl font-semibold text-gray-900 mb-2">Public Lobbies</h3>
//               <p className="text-gray-600">Jump into public chat rooms and meet new people with shared interests.</p>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="py-10 bg-gray-900 text-gray-400 text-center">
//         <p>&copy; {new Date().getFullYear()} Chatterbox. All rights reserved.</p>
//       </footer>
//     </div>
//   );
// };

// export default HomePage;






import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquareText, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Video, // Kept for Watch Party
  Lock,  // Kept for Private Rooms
  Users, // Re-added for Friends/Groups
  FileText, // New icon for File Sharing
} from 'lucide-react';

/**
 * The main landing page for the application.
 * Features a header, hero section, features, and footer.
 * This version uses user-centric language for a real-world product.
 */
const HomePage: React.FC = () => {
  return (
    // min-h-screen ensures full height. font-inter is used globally.
    <div className="min-h-screen flex flex-col font-inter bg-gray-50">
      
      {/* Header - Responsive Navigation */}
      <header className="absolute top-0 left-0 w-full z-10 p-4 md:p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center space-x-2">
          {/* Logo - Made smaller on mobile (w-6) */}
          <MessageSquareText className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
          {/* Title - Now always visible, text size responsive */}
          <span className="text-xl md:text-2xl font-bold text-gray-900">
            Chatterbox
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Login Button - Reduced mobile padding (px-3) */}
          <Link
            to="/login"
            className="px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-semibold text-indigo-600 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
          >
            Log In
          </Link>
          {/* Sign Up Button - Reduced mobile padding (px-3) */}
          <Link
            to="/register"
            className="px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-semibold text-white bg-indigo-600 rounded-full shadow-md hover:bg-indigo-700 transition-colors"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero Section - Centered and Fluid */}
      {/* Adjusted padding top for better responsive feel */}
      <main className="relative grow flex flex-col justify-center items-center text-center p-6 pt-28 md:pt-32"> 
        <div className="max-w-4xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-snug md:leading-tight">
            Your Space.
            <br className="hidden md:block" />
            Your People.
          </h1>
          {/* Changed text-md to text-base for standard responsive sizing */}
          <p className="text-base md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Chatterbox is your all-in-one community to talk, share, and connect in real-time. Built for speed and designed for you.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-full shadow-xl hover:bg-indigo-700 transition-all mx-auto transform hover:scale-105"
          >
            Get Started For Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>

      {/* Features Section - Responsive Grid with User Benefits */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-10 md:mb-16">
            Everything you need to connect
          </h2>
          {/* This grid is already responsive: 1 col on xs, 2 on sm, 3 on md */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
            
            {/* Feature 1: Real-Time Sync (Low-Latency) */}
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <Zap className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Blazing Fast Chat</h3>
              <p className="text-gray-600 text-sm">
                Our real-time engine delivers your messages, reactions, and typing indicators instantly. It feels like you're in the same room.
              </p>
            </div>
            
            {/* Feature 2: Media and File Pipeline */}
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Share Anything, Instantly</h3>
              <p className="text-gray-600 text-sm">
                Drag and drop photos, send voice memos, or upload files. Our smart media pipeline handles the rest without slowing you down.
              </p>
            </div>
            
            {/* Feature 3: Security and Auth */}
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <Lock className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Your Space, Your Rules</h3>
              <p className="text-gray-600 text-sm">
                Create invite-only private rooms, manage members, and use moderation tools to keep your conversations secure.
              </p>
            </div>
            
            {/* Feature 4: Data Consistency */}
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <Video className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Host a Watch Party</h3>
              <p className="text-gray-600 text-sm">
                Sync videos with friends and enjoy your favorite content together, perfectly in time, all from within your chat room.
              </p>
            </div>

             {/* Feature 5: Code Quality and Maintainability */}
             <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <Users className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Your People</h3>
              <p className="text-gray-600 text-sm">
                Manage your friends list, see who's online, and jump straight into a private message (DM) with a single click.
              </p>
            </div>

            {/* Feature 6: Concurrency and Scalability Potential */}
            <div className="text-center p-6 border border-gray-200 rounded-2xl shadow-lg hover:shadow-xl transition-shadow bg-white">
              <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600 text-sm">
                Your conversations are protected. Our reliable infrastructure is built to scale, ensuring your chats are always on and available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:py-10 bg-gray-900 text-gray-400 text-center text-sm md:text-base">
        <p>&copy; {new Date().getFullYear()} Chatterbox. All rights reserved.</p>
      </footer>
    </div>
  );
};

// Removed the BrowserRouter wrapper as it conflicts with the environment's global router.
// This component now relies on the parent environment to provide routing context.
export default HomePage;