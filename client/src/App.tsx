import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import FriendsPage from "./pages/FriendsPage";
import DirectMessagePage from "./pages/DirectMessagePage";
import ConversationsPage from "./pages/ConversationsPage";

const App: React.FC = () => {
  return (
    <div className="p-4">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<ChatRoomPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/dm/:friendId" element={<DirectMessagePage />} />
          <Route path="/conversations" element={<ConversationsPage />} />

        </Routes>
      </Router>
    </div>
  );
};

export default App;