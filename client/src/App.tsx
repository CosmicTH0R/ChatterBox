import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import LobbyPage from "./pages/LobbyPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import HomePage from "./pages/HomePage";

const App: React.FC = () => {
  return (
    <div className="p-4">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
          {/* ✅ Use roomId instead of roomName */}
          <Route path="/room/:roomId" element={<ChatRoomPage />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
