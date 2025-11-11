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
  Trash2,
  Edit,
  Smile,
  Paperclip,
  Loader2,
  ImageIcon,
  VideoIcon,
  ArrowDown,
  Camera,
  Mic,
} from "lucide-react";
import { format } from "date-fns";
import { toast, Toaster } from "react-hot-toast";
import UserInfoModal from "../components/UserInfoModal";
import { Menu, Transition, Dialog } from "@headlessui/react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import MediaViewerModal from "../components/MediaViewerModal";
import CustomAudioPlayer from "../components/CustomAudioPlayer";

// --- INTERFACES ---
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}
interface Message {
  _id: string | number;
  text?: string;
  timestamp: string;
  user: UserInfo;
  isPending?: boolean;
  isEdited?: boolean;
  fileUrl?: string;
  fileType?: string;
  isSystem?: boolean;
}
interface FileToSend {
  fileUrl: string;
  fileType: string;
  fileName: string;
}

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

const isEmojiOnly = (text: string) => {
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic}|\s)+$/u;
  if (!text.trim()) return false;
  return emojiRegex.test(text);
};


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

  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileToSend, setFileToSend] = useState<FileToSend | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // ... (useEffect for fetchRoomDetails - UNCHANGED) ...
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

  // ... (useEffect for socket connection - UNCHANGED) ...
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

  // ... (useEffect for socket event listeners - UNCHANGED) ...
  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit("joinRoom", { roomId });

    socket.on("loadHistory", (history: Message[]) => {
      setMessages(history);
      setIsInitialLoad(false);
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView();
      });
    });

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

  // --- SCROLL: Scroll-to-Bottom Listener (Visibility) ---
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const isScrolledUp =
        container.scrollHeight - container.scrollTop - container.clientHeight >
        300;
      setShowScrollToBottom(isScrolledUp);
    };
    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // --- SCROLL: Auto-Scroll (Smart Smooth Scroll) ---
  useEffect(() => {
    if (isInitialLoad) return; // Ignore on initial load

    const container = chatContainerRef.current;
    if (container) {
      // Check if user is near the bottom (200px threshold)
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;

      if (isNearBottom) {
        // Only scroll smoothly if near the bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };


  // --- HANDLER FUNCTIONS ---

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !roomId) return;
    const textTrimmed = text.trim();

    if (isUploading || (!textTrimmed && !fileToSend)) return;

    // Safety: Stop recording if user hits send button while recording is active
    if (isRecording) {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        toast.dismiss(); // Dismiss the "Recording..." toast if it's still open
    }

    socket.emit("sendMessage", {
      roomId,
      text: textTrimmed,
      fileUrl: fileToSend?.fileUrl,
      fileType: fileToSend?.fileType,
    });

    setText("");
    setFileToSend(null);
    setShowEmojiPicker(false);
    setTypingUsers((prev) => prev.filter((u) => u !== currentUser));
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setText((prevText) => prevText + emojiObject.emoji);
    if (socket && currentUser && roomId) {
      socket.emit("typing", { roomId, user: currentUser });
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraButtonClick = () => {
    fileInputCameraRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !socket) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large (Max 25MB).");
      return;
    }

    setIsUploading(true);
    setFileToSend(null); 
    const toastId = toast.loading("Uploading file...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await axios.post(
        `${API_URL}/api/messages/upload-file`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFileToSend({
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileName: file.name,
      });

      toast.success("File ready to send!", { id: toastId });

    } catch (err: any) {
      console.error("File upload error:", err);
      toast.error(err.response?.data?.message || "File upload failed.", {
        id: toastId,
      });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // --- Voice Recording Handler (TOASTS REMOVED) ---
  const handleMicClick = async () => {
    if (!roomId || !token || !API_URL) return;

    let toastId: string | undefined;

    if (isRecording) {
      // STOP RECORDING
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      // Remove any currently displayed toast related to recording
      if (toastId) toast.dismiss(toastId); 
      
    } else {
      // START RECORDING
      try {
        // NOTE: We only show the "Recording..." toast, and remove it on stop/error
        toastId = toast.loading("Recording... Tap mic to stop.", {
          icon: '🔴',
          duration: Infinity
        });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = []; 

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          // Dismiss the persistent "Recording..." toast
          toast.dismiss(toastId); 
          
          // Show new toast for processing/uploading
          const uploadToastId = toast.loading("Processing voice memo...");

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());

          const audioFile = new File([audioBlob], `voice_memo_${Date.now()}.webm`, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append("file", audioFile);

          setIsUploading(true);

          try {
            const { data } = await axios.post(
              `${API_URL}/api/messages/upload-file`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            setFileToSend({
              fileUrl: data.fileUrl,
              fileType: data.fileType || 'audio', 
              fileName: audioFile.name,
            });

            // Replace "Processing" with final status. If user doesn't want success toast, change to dismiss or update.
            // Since the user explicitly requested to remove the stuck toast, we will simply replace the "Processing" toast with a final confirmation and then dismiss it quickly.
            toast.success("Voice memo ready to send!", { id: uploadToastId, duration: 2000 }); // Show for 2 seconds and auto-close

          } catch (error) {
            console.error("Voice memo upload error:", error);
            // Replace "Processing" with error
            toast.error("Voice memo failed to upload.", { id: uploadToastId });
          } finally {
            setIsUploading(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        setFileToSend(null); 
        setText(""); 

      } catch (error) {
        console.error("Error starting voice recording:", error);
        // Dismiss the toast in case of a microhone error
        if (toastId) toast.dismiss(toastId); 
        setIsRecording(false);
      }
    }
  };
  // --- END Voice Recording Handler ---

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
    setEditedText(message.text || "");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setMessageToEdit(null);
    setEditedText("");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !messageToEdit) return;
    const newTextTrimmed = editedText.trim();

    if (!messageToEdit.fileUrl && !newTextTrimmed) {
      toast.error("Message can't be empty");
      return;
    }

    socket.emit("editMessage", {
      messageId: messageToEdit._id,
      newText: newTextTrimmed,
    });
    closeEditModal();
  };

  const handleDeleteMessage = (messageId: string | number) => {
    if (!socket) return;
    socket.emit("deleteMessage", { messageId });
  };

  const openMediaModal = (url: string, fileType: string) => {
    if (fileType.startsWith("image") || fileType.startsWith("video")) {
      setSelectedMediaUrl(url);
      setSelectedMediaType(fileType);
      setIsMediaModalOpen(true);
    }
  };

  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
    setSelectedMediaUrl(null);
    setSelectedMediaType(null);
  };

  // --- renderMedia Function ---
  const renderMedia = (msg: Message, isMine: boolean) => {
    if (!msg.fileUrl) return null;

    let fileType = msg.fileType;
    if (!fileType) {
      if (msg.fileUrl.match(/\.(mp3|wav|ogg)$/i)) fileType = 'audio';
      else if (msg.fileUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i)) fileType = 'image';
      else if (msg.fileUrl.match(/\.(mp4|webm)$/i)) fileType = 'video';
      else fileType = 'download';
    }

    // Base classes for other media types (image/video link placeholders)
    const baseClasses = "p-3 rounded-lg border flex items-center gap-2.5 cursor-pointer transition-colors w-full max-w-xs";
    const otherClasses = `bg-white border-gray-200 text-gray-700 hover:bg-gray-50`;
    const myClasses = `bg-indigo-500 border-indigo-400 text-white hover:bg-indigo-400`;

    if (fileType.startsWith("image")) {
      return (
        <div
          onClick={() => openMediaModal(msg.fileUrl!, fileType!)}
          className={`${baseClasses} ${isMine ? myClasses : otherClasses}`}
        >
          <ImageIcon className="w-5 h-5 shrink-0" />
          <span className="font-medium">Photo</span>
        </div>
      );
    }

    if (fileType.startsWith("video")) {
      return (
        <div
          onClick={() => openMediaModal(msg.fileUrl!, fileType!)}
          className={`${baseClasses} ${isMine ? myClasses : otherClasses}`}
        >
          <VideoIcon className="w-5 h-5 shrink-0" />
          <span className="font-medium">Video</span>
        </div>
      );
    }

    if (fileType.startsWith("audio")) {
      return (
        <CustomAudioPlayer
          src={msg.fileUrl}
          isMine={isMine}
        />
      );
    }

    // Default case for 'download' fileType or unrecognized formats
    return (
      <a
        href={msg.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium ${isMine ? 'text-white underline' : 'text-indigo-600 underline'}`}
      >
        Download File
      </a>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <Toaster position="top-center" />

      {/* RENDER MODALS DIRECTLY (Original behavior restored) */}
      <UserInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        userId={selectedUserId}
        onStatusChange={() => {}}
      />
      <MediaViewerModal
        isOpen={isMediaModalOpen}
        onClose={closeMediaModal}
        url={selectedMediaUrl}
        fileType={selectedMediaType}
      />

      {/* --- Unsend All My Messages Modal --- */}
      <Transition appear show={isUnsendMyModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsUnsendMyModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" /> Confirm Unsend
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to unsend **ALL** of your messages
                      in this room? This action is permanent and cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                      onClick={() => setIsUnsendMyModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                      onClick={handleConfirmUnsendMyMessages}
                    >
                      Unsend All
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* --- Clear All Modal --- */}
      <Transition appear show={isClearAllModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsClearAllModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2"
                  >
                    <X className="w-5 h-5 text-red-500" /> Clear Chat History
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      As the creator, are you sure you want to **clear all messages** in this room for everyone?
                      This action is permanent.
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                      onClick={() => setIsClearAllModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                      onClick={handleConfirmClearChat}
                    >
                      Clear All
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* --- Edit Modal --- */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeEditModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex items-center gap-2"
                  >
                    <Edit className="w-5 h-5 text-indigo-500" /> Edit Message
                  </Dialog.Title>
                  <form onSubmit={handleEditSubmit} className="mt-4">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Edit your message..."
                    />
                    {messageToEdit?.fileUrl && (
                      <p className="text-sm text-gray-500 mt-2">
                        Note: Media file ({messageToEdit.fileType}) cannot be changed.
                      </p>
                    )}
                    <div className="mt-4 flex justify-end gap-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        onClick={closeEditModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                        disabled={!editedText.trim() && !messageToEdit?.fileUrl}
                      >
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
      {/* END MODALS */}
      
      {/* The main Chat UI starts here */}
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* ... (Sidebar - UNCHANGED) ... */}
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

        {/* ... (Mobile Drawer - UNCHANGED) ... */}
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

        {/* --- Main Chat --- */}
        <div className="flex flex-col grow relative">

          {/* ... (Header - UNCHANGED) ... */}
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

          {/* --- MESSAGES LOOP --- */}
          <div
            ref={chatContainerRef}
            className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col"
          >
            <div className="space-y-4 grow">
              {messages.map((msg, index) => {
                const isMine = msg.user.username === currentUser;
                const isSystem = msg.user.username === "System";

                const previousMsg = messages[index - 1];
                const shouldShowNameAndAvatar = !previousMsg || previousMsg.user._id !== msg.user._id || previousMsg.isSystem;

                const hasMedia = !!msg.fileUrl;
                const isJumbo = msg.text && isEmojiOnly(msg.text) && !hasMedia;
                const useSimpleLayout = !hasMedia && !isJumbo;

                return (
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
                      {!isMine && !isSystem && shouldShowNameAndAvatar && (
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
                      {!isMine && !isSystem && !shouldShowNameAndAvatar && (
                        <div className="w-10 h-10 shrink-0" />
                      )}

                      {isSystem ? (
                        <span className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 bg-gray-200 rounded-full">
                          <Zap className="w-3 h-3 text-gray-400" />
                          {msg.text}
                        </span>
                      ) : (
                        <div
                          className={`flex flex-col max-w-[70%] ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          {shouldShowNameAndAvatar && (
                            <button
                              onClick={() => openInfoModal(msg.user._id)}
                              className="text-sm font-bold text-gray-900 mb-1 hover:underline disabled:no-underline disabled:cursor-default"
                              disabled={isMine}
                            >
                              {msg.user.name || msg.user.username}
                            </button>
                          )}

                          <div className={`relative flex items-center ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>

                            {!isSystem && (isMine || isCreator) && (
                              <Menu.Button className={`p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'mr-2' : 'ml-2'}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Menu.Button>
                            )}

                            <div
                              className={`relative px-4 py-3 rounded-lg shadow-md border flex ${
                                useSimpleLayout
                                  ? "flex-row items-baseline"
                                  : "flex-col"
                              } ${
                                isMine
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white text-gray-800 border-gray-200"
                              } ${msg.isPending ? "opacity-70" : ""}`}
                            >
                              {hasMedia && (
                                <div className="mb-2">{renderMedia(msg, isMine)}</div>
                              )}
                              {msg.text && (
                                <p className={`
                                  ${isJumbo ? 'text-4xl' : ''}
                                  ${
                                    useSimpleLayout
                                      ? 'whitespace-pre-line break-all'
                                      : 'whitespace-pre-line'
                                  }
                                `}>
                                  {msg.text}
                                </p>
                              )}
                              <span className={`text-xs shrink-0 ${
                                isMine ? "text-indigo-200" : "text-gray-400"
                                } ${
                                  useSimpleLayout
                                    ? "ml-2"
                                    : "mt-1 self-end"
                                }`}>
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

                    {/* --- Message Menu Panel --- */}
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items
                        className={`absolute z-10 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
                          isMine ? "right-0" : "left-14"
                        } top-6`}
                      >
                        <div className="py-1">
                          {isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => openEditModal(msg)}
                                  disabled={!msg.text && !!msg.fileUrl}
                                  className={`${
                                    active ? "bg-gray-100" : ""
                                  } group flex w-full items-center px-4 py-2 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed`}
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
                                  className={`${
                                    active ? "bg-red-50" : ""
                                  } group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Unsend
                                </button>
                              )}
                            </Menu.Item>
                          )}
                          {/* --- CREATOR REMOVE BUTTON --- */}
                          {isCreator && !isMine && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className={`${
                                    active ? "bg-red-50" : ""
                                  } group flex w-full items-center px-4 py-2 text-sm text-red-700`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove (Creator)
                                </button>
                              )}
                            </Menu.Item>
                          )}
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* --- Scroll to Bottom Button --- */}
          <Transition
            show={showScrollToBottom}
            as={Fragment}
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 p-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none z-10"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </Transition>

          {/* --- Message Input (File Preview + Camera/Mic) --- */}
          <div className="p-4 bg-white border-t relative z-20">

            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 z-20">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  theme={Theme.LIGHT}
                />
              </div>
            )}

            {/* --- File Preview --- */}
            {fileToSend && (
              <div className="relative p-2 mb-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 truncate">
                  Ready to send: {fileToSend.fileName}
                </span>
                <button
                  onClick={() => setFileToSend(null)}
                  className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={sendMessage} className="flex gap-2 items-center">

              {/* --- Hidden Inputs --- */}
              <input
                type="file"
                ref={fileInputCameraRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*"
                capture="environment"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,audio/*"
              />

              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                disabled={isRecording}
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Paperclip Button */}
              <button
                type="button"
                onClick={handleFileButtonClick}
                disabled={isUploading || isRecording}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </button>

              {/* --- Camera Button --- */}
              <button
                type="button"
                onClick={handleCameraButtonClick}
                disabled={isUploading || isRecording}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
              </button>

              {/* --- Text Input --- */}
              <div className="grow relative">
                {isRecording && (
                  <span className="absolute inset-0 flex items-center justify-start px-4 text-red-500 font-semibold pointer-events-none z-10 bg-gray-100 rounded-lg">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse mr-2"></span>
                    Recording...
                  </span>
                )}
                <input
                  type="text"
                  placeholder={"Type a message..."}
                  value={text}
                  onChange={handleInputChange}
                  disabled={isRecording}
                  className={`grow w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isRecording ? 'opacity-0 disabled:bg-gray-100' : 'disabled:bg-gray-100'
                  }`}
                />
              </div>

              {/* --- Conditional Send/Mic Button --- */}
              {(text.trim().length > 0 || fileToSend) ? (
                // SEND BUTTON
                <button
                  type="submit"
                  disabled={isUploading || isRecording}
                  className="p-3.5 rounded-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition disabled:bg-indigo-400"
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                // MIC BUTTON
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isUploading}
                  className={`p-3.5 rounded-lg font-semibold text-white shadow-md transition ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoomPage;