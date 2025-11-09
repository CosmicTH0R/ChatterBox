import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import FriendsPage from "./pages/FriendsPage"; // <-- 1. Import FriendsPage

const App: React.FC = () => {
  return (
    // The "p-4" class here might add padding around your full-screen pages.
    // Consider removing it if your pages (like Lobby/Profile) handle their own padding.
    <div className="p-4"> 
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<ChatRoomPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friends" element={<FriendsPage />} /> {/* <-- 2. Add new route */}
        </Routes>
      </Router>
    </div>
  );
};

export default App;