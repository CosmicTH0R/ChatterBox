import React, { useEffect, useState, useRef, Fragment } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  ArrowLeft,
  Send,
  Zap,
  Clock,
  MoreVertical, 
  AlertTriangle,
  Trash2, 
  Edit, 
} from "lucide-react";
import { format } from "date-fns";
import { Toaster, toast } from "react-hot-toast";
import { Menu, Transition, Dialog } from "@headlessui/react"; 

// 1. Updated User interface
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

// 2. Updated Message interface
interface Message {
  _id: string | number;
  text: string;
  timestamp: string;
  user: UserInfo;
  isPending?: boolean;
  isEdited?: boolean; // <-- Added
}

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const DirectMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [friendInfo, setFriendInfo] = useState<UserInfo | null>(null);

  // --- 3. NEW STATE FOR MODALS ---
  const [isUnsendMyModalOpen, setIsUnsendMyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editedText, setEditedText] = useState("");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const currentUser = localStorage.getItem("username");
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  // ... (useEffect for finding friend info, unchanged) ...
  useEffect(() => {
    const findFriend = (msgs: Message[]) => {
      if (friendInfo) return; 
      const otherUser = msgs.find(
        (m) => m.user._id !== currentUserId
      )?.user;
      if (otherUser) {
        setFriendInfo(otherUser);
      }
    };
    if (messages.length > 0) {
      findFriend(messages);
    }
  }, [messages, currentUserId, friendInfo]);


  // ... (useEffect for socket connection, unchanged) ...
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

  // --- 4. UPDATED Socket event listeners ---
  useEffect(() => {
    if (!socket || !friendId) return;

    socket.emit("joinDM", { friendId });

    socket.on("loadHistory", (history: Message[]) => {
      setMessages(history);
      if (history.length > 0) {
        const otherUser = history.find(m => m.user._id !== currentUserId)?.user;
        if (otherUser) {
          setFriendInfo(otherUser);
        }
      }
    });

    socket.on("receiveMessage", (pendingMsg: Message) => {
      setMessages((prev) => [...prev, pendingMsg]);
      if (!friendInfo && pendingMsg.user._id !== currentUserId) {
        setFriendInfo(pendingMsg.user);
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
    
    socket.on("connect_error", (err: any) => {
      console.error("Socket connection error:", err.message);
    });

    // --- NEW MODERATION LISTENERS ---
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

    // Cleanup all listeners
    return () => {
      socket.off("loadHistory");
      socket.off("receiveMessage");
      socket.off("messageConfirmed");
      socket.off("systemMessage");
      socket.off("connect_error");
      // --- CLEANUP NEW LISTENERS ---
      socket.off("messagesUnsent");
      socket.off("messageEdited");
      socket.off("messageDeleted");
    };
  }, [socket, friendId, currentUser, currentUserId, friendInfo]);

  // ... (useEffect for scrollToBottom, unchanged) ...
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socket || !friendId) return;
    socket.emit("sendMessage", { friendId, text });
    setText("");
  };
  
  // --- 5. NEW HANDLERS FOR MODERATION ---
  const handleConfirmUnsendMyMessages = () => {
    if (!socket || !friendId) return;
    socket.emit("unsendAllMyDMs", { friendId });
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
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Main Chat (set to full width) */}
        <div className="flex flex-col grow w-full">
          {/* --- 6. HEADER UPDATED WITH 3-DOT MENU --- */}
          <div className="relative flex flex-col items-center p-4 border-b bg-white z-10">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate("/conversations")} // Changed to go to conversations
                className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline md:ml-2">Back to Conversations</span>
              </button>

              <h2 className="text-xl font-bold text-gray-900">
                {friendInfo ? friendInfo.name || friendInfo.username : 'Direct Message'}
              </h2>

              {/* 3-Dot Menu */}
              <div className="flex justify-end" style={{ width: "130px" }}>
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
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col">
            <div className="space-y-4 grow">
              {messages.map((msg) => {
                const isMine = msg.user.username === currentUser;
                const isSystem = msg.user.username === "System";

                return (
                  // --- 7. NEW MENU WRAPPER ---
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
                        <img
                          src={msg.user.avatarUrl || DEFAULT_AVATAR}
                          alt={msg.user.username}
                          className="shrink-0 w-10 h-10 rounded-full bg-gray-200 object-cover"
                          onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                        />
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
                          <span className="text-sm font-bold text-gray-900 mb-1">
                            {msg.user.name || msg.user.username}
                          </span>
                          
                          {/* Bubble + Menu Button Container */}
                          <div className={`relative flex items-center ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            
                            {/* "..." Button (Only for me) */}
                            {isMine && (
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
                                {msg.isEdited && "(edited) "}
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
                    
                    {/* Menu Panel (Only for me) */}
                    {isMine && (
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute z-10 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none right-0 top-6">
                          <div className="py-1">
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
                          </div>
                        </Menu.Items>
                      </Transition>
                    )}
                  </Menu>
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

      {/* --- 8. ADD NEW MODALS --- */}
      
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
                      you have sent in this conversation. This cannot be undone.
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

      {/* Edit Message Modal */}
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

export default DirectMessagePage;