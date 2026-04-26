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
  Hash,
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
  const initialScrollDone = useRef(false);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      if (!initialScrollDone.current && messages.length > 0) {
        container.scrollTop = container.scrollHeight;
        // Small delay just in case DOM needs a tick to render images/content
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);
        initialScrollDone.current = true;
      } else if (initialScrollDone.current) {
        // Check if user is near the bottom (200px threshold)
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 200;

        if (isNearBottom) {
          // Only scroll smoothly if near the bottom
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
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

  const modalStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
  const panelStyle = { background: 'var(--dc-bg-modal)', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '420px', position: 'relative' as const };

  return (
    <div className="dc-layout">
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />

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

      {/* Discord-style chat layout */}
      {/* Members sidebar */}
      <div className="dc-sidebar">
        <div className="dc-sidebar-header" style={{ flexShrink: 0 }}>
          <button onClick={() => navigate('/lobby')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)', fontSize: '13px', fontWeight: 500, padding: 0 }}>
            <ArrowLeft className="w-4 h-4" /> Back to Lobby
          </button>
        </div>
        <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '16px 16px 4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--dc-text-muted)' }}>
            Online — {onlineUsers.length}
          </div>
          {onlineUsers.map(user => (
            <button key={user._id} onClick={() => openInfoModal(user._id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '6px 8px 6px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '4px', margin: '1px 0' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
              <div style={{ position: 'relative' }}>
                <img src={user.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: 'var(--dc-bg-active)' }} onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', background: 'var(--dc-online)', borderRadius: '50%', border: '2px solid var(--dc-bg-secondary)' }} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dc-text-normal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="dc-main">
          {/* Topbar */}
          <div className="dc-topbar" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Hash className="w-5 h-5" style={{ color: 'var(--dc-text-muted)' }} />
              <span>{roomName}</span>
              {typingUsers.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--dc-text-muted)', fontWeight: 400 }}>
                  {typingUsers[0]}{typingUsers.length > 1 ? ` +${typingUsers.length - 1}` : ''} is typing...
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {inviteCode && (
                <button onClick={copyInvite} className="dc-btn dc-btn-secondary" style={{ gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
                  <Clipboard className="w-4 h-4" /> Copy Invite
                </button>
              )}
              <button onClick={() => setIsUserListOpen(!isUserListOpen)} className="dc-btn dc-btn-ghost" style={{ padding: '6px', borderRadius: '4px' }} title="Members">
                <Users className="w-5 h-5" />
              </button>
              <Menu as="div" style={{ position: 'relative' }}>
                <Menu.Button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: 'var(--dc-text-muted)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  <MoreVertical className="w-5 h-5" />
                </Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                  <Menu.Items style={{ position: 'absolute', right: 0, top: '36px', width: '200px', background: 'var(--dc-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--dc-border)', padding: '4px', zIndex: 20 }}>
                    <Menu.Item>{({ active }) => (<button onClick={() => setIsUnsendMyModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: active ? 'var(--dc-bg-hover)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-normal)', fontSize: '14px', borderRadius: '2px' }}><Trash2 className="w-4 h-4" />Unsend my messages</button>)}</Menu.Item>
                    {isCreator && <Menu.Item>{({ active }) => (<button onClick={() => setIsClearAllModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: active ? 'rgba(242,63,67,0.15)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-danger)', fontSize: '14px', borderRadius: '2px' }}><X className="w-4 h-4" />Clear Chat (Creator)</button>)}</Menu.Item>}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', minHeight: 0 }}>
            {messages.map((msg, index) => {
              const isMine = msg.user.username === currentUser;
              const isSystem = msg.user.username === 'System';
              const previousMsg = messages[index - 1];
              const shouldShowHeader = !previousMsg || previousMsg.user._id !== msg.user._id || previousMsg.isSystem;
              const hasMedia = !!msg.fileUrl;
              const isJumbo = msg.text && isEmojiOnly(msg.text) && !hasMedia;

              if (isSystem) return (
                <div key={msg._id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'var(--dc-bg-secondary)', borderRadius: '99px', fontSize: '12px', color: 'var(--dc-text-muted)' }}>
                    <Zap className="w-3 h-3" />{msg.text}
                  </span>
                </div>
              );

              return (
                <Menu as="div" key={msg._id} style={{ position: 'relative' }}>
                  <div className="group" style={{ display: 'flex', gap: '16px', padding: '2px 16px', borderRadius: '4px', marginTop: shouldShowHeader ? '16px' : '0' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>

                    <div style={{ width: '40px', flexShrink: 0 }}>
                      {shouldShowHeader ? (
                        <button onClick={() => openInfoModal(msg.user._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <img src={msg.user.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', background: 'var(--dc-bg-active)' }} onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                        </button>
                      ) : (
                        <span style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', fontSize: '10px', color: 'var(--dc-text-faint)', opacity: 0 }} className="group-hover:opacity-100">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {shouldShowHeader && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                          <button onClick={() => openInfoModal(msg.user._id)} disabled={isMine} style={{ background: 'none', border: 'none', cursor: isMine ? 'default' : 'pointer', padding: 0, fontSize: '15px', fontWeight: 600, color: isMine ? 'var(--dc-accent-light)' : 'var(--dc-text-white)' }}>
                            {msg.user.name || msg.user.username}
                          </button>
                          <span style={{ fontSize: '11px', color: 'var(--dc-text-faint)' }}>{format(new Date(msg.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      )}
                      {hasMedia && <div style={{ marginBottom: msg.text ? '4px' : '0' }}>{renderMedia(msg, isMine)}</div>}
                      {msg.text && (
                        <p style={{ fontSize: isJumbo ? '40px' : '15px', color: 'var(--dc-text-normal)', lineHeight: 1.375, wordBreak: 'break-word', margin: 0 }}>
                          {msg.text}
                          {msg.isEdited && <span style={{ fontSize: '10px', color: 'var(--dc-text-faint)', marginLeft: '4px' }}>(edited)</span>}
                        </p>
                      )}
                    </div>

                    {(isMine || isCreator) && (
                      <div style={{ flexShrink: 0, opacity: 0 }} className="group-hover:opacity-100">
                        <Menu.Button style={{ background: 'var(--dc-bg-secondary)', border: '1px solid var(--dc-border)', borderRadius: '4px', cursor: 'pointer', padding: '4px 6px', color: 'var(--dc-text-muted)', display: 'flex' }}>
                          <MoreVertical className="w-4 h-4" />
                        </Menu.Button>
                      </div>
                    )}
                  </div>

                  <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                    <Menu.Items style={{ position: 'absolute', right: '48px', top: '4px', background: 'var(--dc-bg-tertiary)', border: '1px solid var(--dc-border)', borderRadius: '4px', padding: '4px', zIndex: 20, minWidth: '160px' }}>
                      {isMine && <Menu.Item>{({ active }) => (<button onClick={() => openEditModal(msg)} disabled={!msg.text && !!msg.fileUrl} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 10px', background: active ? 'var(--dc-bg-hover)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-normal)', fontSize: '14px', borderRadius: '2px' }}><Edit className="w-4 h-4" />Edit Message</button>)}</Menu.Item>}
                      {isMine && <Menu.Item>{({ active }) => (<button onClick={() => handleDeleteMessage(msg._id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 10px', background: active ? 'rgba(242,63,67,0.15)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-danger)', fontSize: '14px', borderRadius: '2px' }}><Trash2 className="w-4 h-4" />Unsend</button>)}</Menu.Item>}
                      {isCreator && !isMine && <Menu.Item>{({ active }) => (<button onClick={() => handleDeleteMessage(msg._id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 10px', background: active ? 'rgba(242,63,67,0.15)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-danger)', fontSize: '14px', borderRadius: '2px' }}><Trash2 className="w-4 h-4" />Remove (Creator)</button>)}</Menu.Item>}
                    </Menu.Items>
                  </Transition>
                </Menu>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          <Transition show={showScrollToBottom} as={Fragment} enter="transition-opacity duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <button onClick={scrollToBottom} style={{ position: 'absolute', bottom: '80px', right: '280px', width: '36px', height: '36px', borderRadius: '50%', background: 'var(--dc-bg-secondary)', border: '1px solid var(--dc-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dc-text-normal)', zIndex: 10 }}>
              <ArrowDown className="w-5 h-5" />
            </button>
          </Transition>

          {/* Input area */}
          <div style={{ padding: '0 16px 16px', flexShrink: 0 }}>
            {showEmojiPicker && <div style={{ position: 'absolute', bottom: '80px', left: '260px', zIndex: 20 }}><EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} theme={Theme.DARK as any} /></div>}

            {fileToSend && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--dc-bg-secondary)', borderRadius: '4px 4px 0 0', padding: '8px 16px', borderBottom: '1px solid var(--dc-border)' }}>
                <span style={{ fontSize: '14px', color: 'var(--dc-text-normal)' }}>📎 {fileToSend.fileName}</span>
                <button onClick={() => setFileToSend(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)', padding: '4px' }}><X className="w-4 h-4" /></button>
              </div>
            )}

            <form onSubmit={sendMessage} style={{ display: 'flex', alignItems: 'center', background: 'var(--dc-bg-active)', borderRadius: '8px', padding: '0 4px 0 12px', gap: '4px' }}>
              <input type="file" ref={fileInputCameraRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" capture="environment" />
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*,audio/*" />

              <button type="button" onClick={handleFileButtonClick} disabled={isUploading || isRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--dc-text-muted)', flexShrink: 0 }}>
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              </button>
              <button type="button" onClick={handleCameraButtonClick} disabled={isUploading || isRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--dc-text-muted)', flexShrink: 0 }}>
                <Camera className="w-5 h-5" />
              </button>

              <div style={{ flex: 1, position: 'relative' }}>
                {isRecording && (
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: '8px', color: 'var(--dc-danger)', fontWeight: 600, fontSize: '14px', pointerEvents: 'none' }}>
                    <span style={{ width: '8px', height: '8px', background: 'var(--dc-danger)', borderRadius: '50%', marginRight: '8px', animation: 'pulse 1s infinite' }} />Recording...
                  </span>
                )}
                <input type="text" placeholder={`Message #${roomName}`} value={text} onChange={handleInputChange} disabled={isRecording} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--dc-text-normal)', fontSize: '15px', padding: '12px 8px', fontFamily: 'inherit', opacity: isRecording ? 0 : 1 }} />
              </div>

              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--dc-text-muted)', flexShrink: 0 }}>
                <Smile className="w-5 h-5" />
              </button>
              {(text.trim().length > 0 || fileToSend) ? (
                <button type="submit" disabled={isUploading || isRecording} style={{ background: 'var(--dc-accent)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '4px', color: 'white', flexShrink: 0, margin: '4px' }}>
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button type="button" onClick={handleMicClick} disabled={isUploading} style={{ background: isRecording ? 'var(--dc-danger)' : 'var(--dc-accent)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '4px', color: 'white', flexShrink: 0, margin: '4px' }}>
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        </div>
    </div>
  );
};

export default ChatRoomPage;
