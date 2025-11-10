import React, { useEffect, useState, useRef, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import {
  ArrowLeft,
  Send,
  Zap,
  Users,
  X,
  Clock,
  Clipboard,
  MoreVertical,
  AlertTriangle,
  Trash2,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import { toast, Toaster } from "react-hot-toast";
import UserInfoModal from "../components/UserInfoModal";
import { Menu, Transition, Dialog } from "@headlessui/react";

// --- INTERFACES ---
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface Message {
  _id: string | number;
  text: string;
  timestamp: string;
  user: UserInfo;
  isPending?: boolean;
  isEdited?: boolean; // <-- Added
}

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const ChatRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserInfo[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [roomName, setRoomName] = useState("Loading room...");
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [isCreator, setIsCreator] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isUnsendMyModalOpen, setIsUnsendMyModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editedText, setEditedText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const API_URL = import.meta.env.VITE_API_URL;
  const currentUser = localStorage.getItem("username");
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!socket || !currentUser || !roomId) return;
    socket.emit("typing", { roomId, user: currentUser });
  };

  // ... (useEffect for fetchRoomDetails) ...
  useEffect(() => {
    if (!roomId || !token || !currentUserId) return;
    const fetchRoomDetails = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoomName(res.data.name);
        if (res.data.creator) {
          setIsCreator(res.data.creator.toString() === currentUserId);
        }
      } catch (err) {
        console.error("Error fetching room details:", err);
        setRoomName("Private Room");
      }
    };
    fetchRoomDetails();
  }, [roomId, token, API_URL, navigate, currentUserId]);

  // ... (useEffect for socket connection) ...
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token },
    });
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [SOCKET_URL, token, navigate]);

  // ... (useEffect for socket event listeners) ...
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("joinRoom", { roomId });

    socket.on("loadHistory", (history: Message[]) => setMessages(history));

    socket.on("receiveMessage", (pendingMsg: Message) => {
      setMessages((prev) => [...prev, pendingMsg]);
      if (pendingMsg.user.username !== currentUser) {
        setTypingUsers((prev) =>
          prev.filter((u) => u !== pendingMsg.user.username)
        );
      }
    });

    socket.on(
      "messageConfirmed",
      (data: { tempId: string | number; savedMessage: Message }) => {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === data.tempId ? data.savedMessage : msg))
        );
      }
    );

    socket.on("systemMessage", (msg) => {
      const systemMessage: Message = {
        _id: new Date().getTime(),
        text: msg,
        timestamp: new Date().toISOString(),
        user: { _id: "system", username: "System" },
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    socket.on("updateUserList", (userList: UserInfo[]) => {
      setOnlineUsers(userList);
    });

    socket.on("userTyping", (user: string) => {
      if (!user || user === currentUser) return;
      setTypingUsers((prev) => (prev.includes(user) ? prev : [...prev, user]));
      if (typingTimeouts.current[user])
        clearTimeout(typingTimeouts.current[user]);
      typingTimeouts.current[user] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== user));
        delete typingTimeouts.current[user];
      }, 2000);
    });

    socket.on("roomDetails", (details: { inviteCode: string }) => {
      if (details.inviteCode) setInviteCode(details.inviteCode);
    });

    // --- MODERATION LISTENERS ---
    socket.on("chatCleared", () => {
      setMessages([]);
      toast.success("Chat history was cleared by the creator.");
    });
    socket.on("messagesUnsent", (payload: { userId: string }) => {
      if (!payload.userId) return;
      setMessages((prev) =>
        prev.filter((msg) => msg.user._id !== payload.userId)
      );
      if (payload.userId === currentUserId) {
        toast.success("Your messages have been unsent.");
      }
    });
    socket.on("messageEdited", (editedMessage: Message) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === editedMessage._id ? editedMessage : msg
        )
      );
    });
    socket.on("messageDeleted", (payload: { messageId: string | number }) => {
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== payload.messageId)
      );
    });
    
    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    // Cleanup all listeners
    return () => {
      socket.off("loadHistory");
      socket.off("receiveMessage");
      socket.off("messageConfirmed");
      socket.off("systemMessage");
      socket.off("updateUserList");
      socket.off("userTyping");
      socket.off("roomDetails");
      socket.off("connect_error");
      socket.off("chatCleared");
      socket.off("messagesUnsent");
      socket.off("messageEdited");
      socket.off("messageDeleted");
    };
  }, [socket, roomId, currentUser, currentUserId]);

  // ... (useEffect for scrollToBottom) ...
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- HANDLER FUNCTIONS ---
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket || !roomId) return;
    socket.emit("sendMessage", { roomId, text });
    setText("");
    setTypingUsers((prev) => prev.filter((u) => u !== currentUser));
  };

  const copyInvite = () => {
    if (!inviteCode || !roomName) return;
    const inviteText = `Join my room "${roomName}" on Chatterbox! Code: ${inviteCode}`;
    navigator.clipboard.writeText(inviteText).then(
      () => toast.success("Invite copied to clipboard!"),
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy invite.");
      }
    );
  };

  const openInfoModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedUserId(null);
  };

  const handleConfirmClearChat = () => {
    if (!socket || !roomId) return;
    socket.emit("clearRoomChat", { roomId });
    setIsClearAllModalOpen(false);
  };

  const handleConfirmUnsendMyMessages = () => {
    if (!socket || !roomId) return;
    socket.emit("unsendAllMyRoomMessages", { roomId });
    setIsUnsendMyModalOpen(false);
  };

  const openEditModal = (message: Message) => {
    setMessageToEdit(message);
    setEditedText(message.text);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setMessageToEdit(null);
    setEditedText("");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !messageToEdit || !editedText.trim()) return;
    socket.emit("editMessage", {
      messageId: messageToEdit._id,
      newText: editedText.trim(),
    });
    closeEditModal();
  };

  const handleDeleteMessage = (messageId: string | number) => {
    if (!socket) return;
    socket.emit("deleteMessage", { messageId });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <Toaster position="top-center" />
      
      <UserInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        userId={selectedUserId}
        onStatusChange={() => {}}
      />
      
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Sidebar (Fixed) */}
        <div className="hidden md:flex flex-col w-48 border-r border-gray-200 p-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-2">Who's Online</h3>
          <ul className="space-y-2">
            {onlineUsers.map((user) => (
              <li key={user._id} className="flex items-center gap-2 text-gray-900 truncate">
                <span className="w-3 h-3 bg-green-500 rounded-full shrink-0" />
                <button 
                  onClick={() => openInfoModal(user._id)}
                  className="truncate hover:underline text-left"
                  title={user.name || user.username}
                >
                  {user.name || user.username}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Drawer (Fixed) */}
        {isUserListOpen && (
          <div
            onClick={() => setIsUserListOpen(false)}
            className="absolute inset-0 bg-black/30 z-10 md:hidden"
          />
        )}
        <div
          className={`absolute top-0 right-0 h-full w-64 bg-gray-50 p-4 shadow-xl transition-transform duration-300 ease-in-out z-20 md:hidden ${
            isUserListOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-700">Who's Online</h3>
            <button
              onClick={() => setIsUserListOpen(false)}
              className="p-1 rounded-lg text-gray-600 hover:bg-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ul className="space-y-2">
            {onlineUsers.map((user) => (
              <li key={user._id} className="flex items-center gap-2 text-gray-900 truncate">
                <span className="w-3 h-3 bg-green-500 rounded-full shrink-0" />
                 <button 
                  onClick={() => openInfoModal(user._id)}
                  className="truncate hover:underline text-left"
                  title={user.name || user.username}
                >
                  {user.name || user.username}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Chat */}
        <div className="flex flex-col grow">
          {/* Header (Fixed) */}
          <div className="relative flex flex-col items-center p-4 border-b bg-white z-10">
             <div className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate("/lobby")}
                className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline md:ml-2">Back to Lobby</span>
              </button>
              <h2 className="text-xl font-bold text-gray-900">{roomName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsUserListOpen(true)}
                  className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
                >
                  <Users className="w-5 h-5" />
                </button>
                <div className="hidden md:flex justify-end">
                  {inviteCode && (
                    <button
                      onClick={copyInvite}
                      title="Copy Invite Code"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition"
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>Copy Invite</span>
                    </button>
                  )}
                </div>
                {/* 3-Dot Menu (Fixed) */}
                <Menu as="div" className="relative inline-block text-left">
                  <div>
                    <Menu.Button className="p-2 rounded-lg text-gray-700 hover:bg-gray-100">
                      <MoreVertical className="w-5 h-5" />
                    </Menu.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => setIsUnsendMyModalOpen(true)}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                            >
                              <Trash2 className="mr-2 h-5 w-5" />
                              Unsend all my messages
                            </button>
                          )}
                        </Menu.Item>
                        {isCreator && (
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => setIsClearAllModalOpen(true)}
                                className={`${
                                  active ? 'bg-red-50' : ''
                                } group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                              >
                                <X className="mr-2 h-5 w-5" />
                                Clear Chat History (Creator)
                              </button>
                            )}
                          </Menu.Item>
                        )}
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
            {/* Typing Indicator (Fixed) */}
            {typingUsers.length > 0 && (
              <div className="absolute bottom-0 text-sm text-gray-500 mt-1">
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                  : `${typingUsers[0]}, ${typingUsers[1]} and ${
                      typingUsers.length - 2
                    } others are typing...`}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col">
            <div className="space-y-4 grow">
              {messages.map((msg) => {
                const isMine = msg.user.username === currentUser;
                const isSystem = msg.user.username === "System";

                return (
                  // --- START: NEW MENU WRAPPER ---
                  <Menu as="div" className="relative" key={msg._id}>
                    <div
                      className={`group flex gap-3 mb-2 ${
                        isSystem
                          ? "justify-center"
                          : isMine
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {/* Avatar (other users) */}
                      {!isMine && !isSystem && (
                        <button 
                          type="button" 
                          onClick={() => openInfoModal(msg.user._id)}
                        >
                          <img
                            src={msg.user.avatarUrl || DEFAULT_AVATAR}
                            alt={msg.user.username}
                            className="shrink-0 w-10 h-10 rounded-full bg-gray-200 object-cover cursor-pointer hover:opacity-80"
                            onError={(e) =>
                              (e.currentTarget.src = DEFAULT_AVATAR)
                            }
                          />
                        </button>
                      )}

                      {/* System Message */}
                      {isSystem ? (
                        <span className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
                          <Zap className="w-3 h-3 text-gray-400" />
                          {msg.text}
                        </span>
                      ) : (
                        // User Message
                        <div
                          className={`flex flex-col max-w-[70%] ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          <button
                            onClick={() => openInfoModal(msg.user._id)}
                            className="text-sm font-bold text-gray-900 mb-1 hover:underline disabled:no-underline disabled:cursor-default"
                            disabled={isMine} 
                          >
                            {msg.user.name || msg.user.username}
                          </button>
                          
                          {/* Bubble + Menu Button Container */}
                          <div className={`relative flex items-center ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* "..." Button */}
                            {!isSystem && (isMine || isCreator) && (
                              <Menu.Button className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'mr-2' : 'ml-2'}">
                                <MoreVertical className="w-4 h-4" />
                              </Menu.Button>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`relative px-4 py-3 rounded-lg shadow-md border whitespace-pre-wrap flex flex-row items-baseline ${
                                isMine
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-gray-800 border-gray-200"
                              } ${msg.isPending ? "opacity-70" : ""}`}
                            >
                              <p className="wrap-break-words">{msg.text}</p>
                              <span
                                className={`text-xs ml-2 shrink-0 ${
                                  isMine ? "text-indigo-200" : "text-gray-400"
                                }`}
                              >
                                {msg.isEdited && !isMine && "(edited) "}
                                {msg.isPending ? (
                                  <Clock className="w-3 h-3 animate-spin" />
                                ) : (
                                  format(new Date(msg.timestamp), "HH:mm")
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Menu Panel */}
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      {/* Position the menu panel */}
                      <Menu.Items className={`absolute z-10 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${isMine ? 'right-0' : 'left-14'} top-6`}>
                        <div className="py-1">
                          {isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(msg)}
                                  className={`${active ? 'bg-gray-100' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </button>
                              )}
                            </Menu.Item>
                          )}
                          {isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className={`${active ? 'bg-red-50' : ''} group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Unsend
                                </button>
                              )}
                            </Menu.Item>
                          )}
                          {isCreator && !isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className={`${active ? 'bg-red-50' : ''} group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </button>
                              )}
                            </Menu.Item>
                          )}
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                  // --- END: NEW MENU WRAPPER ---
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 bg-white border-t">
            <form onSubmit={sendMessage} className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={handleInputChange}
                className="grow px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-3.5 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* --- ALL MODALS --- */}

      {/* Unsend All My Messages Modal */}
      <Transition appear show={isUnsendMyModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsUnsendMyModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Unsend All My Messages
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Are you sure? This will permanently delete all messages
                      you have sent in this room. This cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button type="button" className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setIsUnsendMyModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700" onClick={handleConfirmUnsendMyMessages}>
                      Yes, Unsend All
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Clear All Chat History Modal (Creator) */}
      <Transition appear show={isClearAllModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsClearAllModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Clear All Chat History?
                  </Dialog.Title>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Are you sure? This will permanently delete all messages
                      in this room for everyone. This cannot be undone.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button type="button" className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={() => setIsClearAllModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700" onClick={handleConfirmClearChat}>
                      Yes, Clear Chat
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* NEW Edit Message Modal */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeEditModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                    Edit Message
                  </Dialog.Title>
                  <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full h-32 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <div className="mt-6 flex justify-end gap-3">
                      <button type="button" className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200" onClick={closeEditModal}>
                        Cancel
                      </button>
                      <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
};

export default ChatRoomPage;