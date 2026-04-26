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
  Paperclip,
  Smile,
  ArrowDown,
  X,
  Loader2,
  ImageIcon,
  VideoIcon,
  Camera,
  Mic,
} from "lucide-react";
import { format } from "date-fns";
import { Toaster, toast } from "react-hot-toast";
import { Menu, Transition, Dialog } from "@headlessui/react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import MediaViewerModal from "../components/MediaViewerModal";
import axios from "axios";
import CustomAudioPlayer from "../components/CustomAudioPlayer";

// --- INTERFACES (Unchanged) ---
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
}
interface FileToSend {
  fileUrl: string;
  fileType: string;
  fileName: string;
}

const DEFAULT_AVATAR = "https://api.dicebear.com/7.x/bottts/svg";

// --- EMOJI HELPER (Unchanged) ---
const isEmojiOnly = (text: string) => {
  const emojiRegex =
    /^(?:\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic}|\s)+$/u;
  if (!text.trim()) return false;
  return emojiRegex.test(text);
};

const DirectMessagePage: React.FC = () => {
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [friendInfo, setFriendInfo] = useState<UserInfo | null>(null);

  const [isUnsendMyModalOpen, setIsUnsendMyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editedText, setEditedText] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(
    null
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [fileToSend, setFileToSend] = useState<FileToSend | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // --- 1. NEW STATE (Online, Typing, Scroll) ---
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFriendOnline, setIsFriendOnline] = useState(false);
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- 2. NEW REF (Typing) ---
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const currentUser = localStorage.getItem("username");
  const currentUserId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  // --- 3. UPDATED `handleInputChange` (Real Typing Logic) ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);

    if (!socket || !friendId) return;

    if (newText.length > 0 && !isFriendTyping) {
      // Send "start typing" only if not already typing
      socket.emit("dmTyping", { friendId });
    } else if (newText.length === 0) {
      // Send "stop typing" when text is cleared
      socket.emit("stopDmTyping", { friendId });
    }
  };

  // ... (useEffect for finding friend info, unchanged) ...
  useEffect(() => {
    const findFriend = (msgs: Message[]) => {
      if (friendInfo) return;
      const otherUser = msgs.find((m) => m.user._id !== currentUserId)?.user;
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

  // --- 4. UPDATED Socket Listeners (Scroll, Typing, Online) ---
  useEffect(() => {
    if (!socket || !friendId) return;

    socket.emit("joinDM", { friendId });

    // --- `loadHistory` (Your scroll fix) ---
    socket.on("loadHistory", (history: Message[]) => {
      setMessages(history);
      setIsInitialLoad(false); // <-- ADDED
      if (history.length > 0) {
        const otherUser = history.find(
          (m) => m.user._id !== currentUserId
        )?.user;
        if (otherUser) {
          setFriendInfo(otherUser);
        }
      }
    });

    // --- `receiveMessage` (Stops typing) ---
    socket.on("receiveMessage", (pendingMsg: Message) => {
      setMessages((prev) => [...prev, pendingMsg]);
      // Stop typing status when a message is received
      setIsFriendTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (!friendInfo && pendingMsg.user._id !== currentUserId) {
        setFriendInfo(pendingMsg.user);
      }
    });

    // ... (messageConfirmed, systemMessage, connect_error, moderation... unchanged) ...
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
        prev.map((msg) => (msg._id === editedMessage._id ? editedMessage : msg))
      );
    });
    socket.on("messageDeleted", (payload: { messageId: string | number }) => {
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== payload.messageId)
      );
    });

    // --- NEW/FIXED LISTENERS FOR STATUS ---
    socket.on("friendStatus", (data: { isOnline: boolean }) => {
      setIsFriendOnline(data.isOnline);
    });

    socket.on(
      "userStatusUpdate",
      (data: { userId: string; isOnline: boolean }) => {
        if (data.userId === friendId) {
          setIsFriendOnline(data.isOnline);
        }
      }
    );

    // Friend starts typing
    socket.on("friendTyping", () => {
      setIsFriendTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Set a timeout to clear typing status
      typingTimeoutRef.current = setTimeout(() => {
        setIsFriendTyping(false);
      }, 3000);
    });

    // Friend stops typing (cleared input)
    socket.on("friendStoppedTyping", () => {
      setIsFriendTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    });

    // Cleanup all listeners
    return () => {
      socket.off("loadHistory");
      socket.off("receiveMessage");
      socket.off("messageConfirmed");
      socket.off("systemMessage");
      socket.off("connect_error");
      socket.off("messagesUnsent");
      socket.off("messageEdited");
      socket.off("messageDeleted");
      // --- CLEANUP NEW LISTENERS ---
      socket.off("friendStatus");
      socket.off("userStatusUpdate");
      socket.off("friendTyping");
      socket.off("friendStoppedTyping"); // <-- ADDED
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [socket, friendId, currentUser, currentUserId, friendInfo]);

  // ... (useEffect for Scroll-to-Bottom Button listener, unchanged) ...
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

  // --- 5. UPDATED Auto-Scroll useEffect (Your fix) ---
  const initialScrollDone = useRef(false);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      if (!initialScrollDone.current && messages.length > 0) {
        // On initial load, scroll to bottom *instantly*
        container.scrollTop = container.scrollHeight;
        // Small delay just in case DOM needs a tick to render
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 50);
        initialScrollDone.current = true;
      } else if (initialScrollDone.current) {
        // For new messages, scroll *smoothly* only if near the bottom
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          200;
        if (isNearBottom) {
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

  // --- 6. UPDATED `sendMessage` (Emits Stop Typing) ---
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !friendId) return;
    const textTrimmed = text.trim();
    if (isUploading || (!textTrimmed && !fileToSend)) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      toast.dismiss(); // Dismiss the "Recording..." toast
    }

    socket.emit("sendMessage", {
      friendId,
      text: textTrimmed,
      fileUrl: fileToSend?.fileUrl,
      fileType: fileToSend?.fileType,
    });

    // Also tell friend we stopped typing
    socket.emit("stopDmTyping", { friendId });

    setText("");
    setFileToSend(null);
    setShowEmojiPicker(false);
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setText((prev) => prev + emojiObject.emoji);
    // Also emit typing event
    if (socket && friendId) {
      socket.emit("dmTyping", { friendId });
    }
  };

  // ... (rest of handlers and renderMedia function unchanged) ...
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
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
  const handleConfirmUnsendMyMessages = () => {
    if (!socket || !friendId) return;
    socket.emit("unsendAllMyDMs", { friendId });
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

// --- renderMedia Function (Updated) ---
  const renderMedia = (msg: Message, isMine: boolean) => {
    if (!msg.fileUrl) return null;

    let fileType = msg.fileType;
    if (!fileType) {
      if (msg.fileUrl.match(/\.(mp3|wav|ogg|webm)$/i)) fileType = 'audio';
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

    // --- THIS IS THE CHANGE ---
    if (fileType.startsWith("audio")) {
      return (
        <CustomAudioPlayer
          src={msg.fileUrl}
          isMine={isMine}
        />
      );
    }
    // --- END OF CHANGE ---

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

  const handleCameraButtonClick = () => {
    fileInputCameraRef.current?.click();
  };
 const handleMicClick = async () => {
  if (!friendId || !token || !API_URL) return; // <-- Changed from roomId

  let toastId: string | undefined;

  if (isRecording) {
    // STOP RECORDING
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    // Remove any currently displayed toast related to recording
    toast.dismiss(toastId); // I fixed this from the original to just toast.dismiss()
  } else {
    // START RECORDING
    try {
      // NOTE: We only show the "Recording..." toast, and remove it on stop/error
      toastId = toast.loading("Recording... Tap mic to stop.", {
        icon: "🔴",
        duration: Infinity,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
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

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());

        const audioFile = new File(
          [audioBlob],
          `voice_memo_${Date.now()}.webm`,
          { type: "audio/webm" }
        );
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
            fileType: data.fileType || "audio",
            fileName: audioFile.name,
          });

          // Replace "Processing" with final status. If user doesn't want success toast, change to dismiss or update.
          // Since the user explicitly requested to remove the stuck toast, we will simply replace the "Processing" toast with a final confirmation and then dismiss it quickly.
          toast.success("Voice memo ready to send!", {
            id: uploadToastId,
            duration: 2000,
          }); // Show for 2 seconds and auto-close
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
};  const modalStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
  const panelStyle = { background: 'var(--dc-bg-modal)', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '420px', position: 'relative' as const };

  return (
    <div className="dc-layout">
      <Toaster position="top-center" toastOptions={{ style: { background: '#313338', color: '#DBDEE1', border: '1px solid #3F4147' } }} />

      {/* --- Unsend All My Messages Modal --- */}
      <Transition appear show={isUnsendMyModalOpen} as={Fragment}>
        <Dialog as="div" style={{ position: 'relative', zIndex: 50 }} onClose={() => setIsUnsendMyModalOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
          </Transition.Child>

          <div style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel style={panelStyle}>
                  <Dialog.Title as="h3" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dc-text-normal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 className="w-5 h-5" style={{ color: 'var(--dc-danger)' }} /> Confirm Unsend
                  </Dialog.Title>
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '14px', color: 'var(--dc-text-muted)' }}>
                      Are you sure you want to unsend ALL of your messages in this conversation? This action is permanent and cannot be undone.
                    </p>
                  </div>
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" onClick={() => setIsUnsendMyModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--dc-text-normal)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>Cancel</button>
                    <button type="button" onClick={handleConfirmUnsendMyMessages} className="dc-btn dc-btn-danger">Yes, Unsend All</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- Edit Message Modal --- */}
      <Transition appear show={isEditModalOpen} as={Fragment}>
        <Dialog as="div" style={{ position: 'relative', zIndex: 50 }} onClose={closeEditModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
          </Transition.Child>
          <div style={{ position: 'fixed', inset: 0, overflowY: 'auto' }}>
            <div style={{ display: 'flex', minHeight: '100%', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel style={panelStyle}>
                  <Dialog.Title as="h3" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--dc-text-normal)', marginBottom: '16px' }}>Edit Message</Dialog.Title>
                  <form onSubmit={handleEditSubmit}>
                    <textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} className="dc-input" style={{ height: '120px', resize: 'none', marginBottom: '16px' }} autoFocus />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button type="button" onClick={closeEditModal} style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--dc-text-normal)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>Cancel</button>
                      <button type="submit" className="dc-btn dc-btn-primary">Save Changes</button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <MediaViewerModal isOpen={isMediaModalOpen} onClose={closeMediaModal} url={selectedMediaUrl} fileType={selectedMediaType} />

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        
        {/* Sidebar (Conversations Navigation / Profile Panel) */}
        <div className="dc-sidebar">
          <div className="dc-sidebar-header" onClick={() => navigate('/conversations')} style={{ cursor: 'pointer', gap: '8px' }}>
            <ArrowLeft className="w-5 h-5" /> Back
          </div>
          
          {friendInfo && (
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <img src={friendInfo.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', background: 'var(--dc-bg-active)' }} onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                <span style={{ position: 'absolute', bottom: 4, right: 4, width: '16px', height: '16px', background: isFriendOnline ? 'var(--dc-online)' : 'var(--dc-offline)', borderRadius: '50%', border: '3px solid var(--dc-bg-secondary)' }} />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'var(--dc-text-white)' }}>{friendInfo.name || friendInfo.username}</h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--dc-text-muted)' }}>@{friendInfo.username}</p>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0, background: 'var(--dc-bg-primary)' }}>
          {/* Topbar */}
          <div className="dc-topbar" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px', color: 'var(--dc-text-muted)' }}>@</span>
              <span style={{ fontWeight: 600 }}>{friendInfo ? (friendInfo.name || friendInfo.username) : "Loading..."}</span>
              {isFriendTyping && (
                <span style={{ fontSize: '12px', color: 'var(--dc-text-muted)', fontWeight: 400, marginLeft: '8px' }}>is typing...</span>
              )}
            </div>
            
            <Menu as="div" style={{ position: 'relative' }}>
              <Menu.Button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: 'var(--dc-text-muted)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                <MoreVertical className="w-5 h-5" />
              </Menu.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                <Menu.Items style={{ position: 'absolute', right: 0, top: '36px', width: '200px', background: 'var(--dc-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--dc-border)', padding: '4px', zIndex: 20 }}>
                  <Menu.Item>{({ active }) => (<button onClick={() => setIsUnsendMyModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: active ? 'var(--dc-bg-hover)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-normal)', fontSize: '14px', borderRadius: '2px' }}><Trash2 className="w-4 h-4" />Unsend my messages</button>)}</Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          {/* Messages List */}
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
                        <img src={msg.user.avatarUrl || DEFAULT_AVATAR} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', background: 'var(--dc-bg-active)' }} onError={e => (e.currentTarget.src = DEFAULT_AVATAR)} />
                      ) : (
                        <span style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px', fontSize: '10px', color: 'var(--dc-text-faint)', opacity: 0 }} className="group-hover:opacity-100">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, opacity: msg.isPending ? 0.6 : 1 }}>
                      {shouldShowHeader && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--dc-text-normal)' }}>{msg.user.name || msg.user.username}</span>
                          <span style={{ fontSize: '12px', color: 'var(--dc-text-muted)' }}>{format(new Date(msg.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      )}

                      {hasMedia && <div style={{ margin: '4px 0' }}>{renderMedia(msg, isMine)}</div>}

                      {msg.text && (
                        <div style={{ fontSize: isJumbo ? '48px' : '15px', color: 'var(--dc-text-normal)', lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.text}
                          {msg.isEdited && <span style={{ fontSize: '11px', color: 'var(--dc-text-faint)', marginLeft: '4px' }}>(edited)</span>}
                        </div>
                      )}
                    </div>

                    {isMine && !msg.isPending && (
                      <div style={{ position: 'absolute', right: '16px', top: '-16px', display: 'none', background: 'var(--dc-bg-secondary)', border: '1px solid var(--dc-border)', borderRadius: '4px', padding: '2px', zIndex: 10 }} className="group-hover:flex">
                        <Menu.Button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-muted)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-normal)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--dc-text-muted)'}>
                          <MoreVertical className="w-4 h-4" />
                        </Menu.Button>
                      </div>
                    )}
                  </div>

                  {isMine && !msg.isPending && (
                    <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                      <Menu.Items style={{ position: 'absolute', right: '16px', top: '16px', width: '160px', background: 'var(--dc-bg-tertiary)', borderRadius: '4px', border: '1px solid var(--dc-border)', padding: '4px', zIndex: 20 }}>
                        <Menu.Item>{({ active }) => (<button onClick={() => openEditModal(msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 8px', background: active ? 'var(--dc-bg-hover)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-text-normal)', fontSize: '13px', borderRadius: '2px' }}><Edit className="w-4 h-4" />Edit</button>)}</Menu.Item>
                        <Menu.Item>{({ active }) => (<button onClick={() => handleDeleteMessage(msg._id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '6px 8px', background: active ? 'rgba(242,63,67,0.15)' : 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-danger)', fontSize: '13px', borderRadius: '2px' }}><Trash2 className="w-4 h-4" />Delete</button>)}</Menu.Item>
                      </Menu.Items>
                    </Transition>
                  )}
                </Menu>
              );
            })}
            <div ref={messagesEndRef} style={{ height: 1 }} />
          </div>

          {/* New Messages Alert */}
          <Transition show={showScrollToBottom} enter="transition-opacity duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div style={{ position: 'absolute', bottom: '90px', right: '32px', zIndex: 10 }}>
              <button onClick={scrollToBottom} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--dc-bg-secondary)', border: '1px solid var(--dc-border)', borderRadius: '99px', color: 'var(--dc-text-normal)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-hover)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--dc-bg-secondary)'}>
                <ArrowDown className="w-4 h-4" /> View recent messages
              </button>
            </div>
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
                <input type="text" placeholder={`Message @${friendInfo ? (friendInfo.name || friendInfo.username) : "User"}`} value={text} onChange={handleInputChange} disabled={isRecording} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--dc-text-normal)', fontSize: '15px', padding: '12px 8px', fontFamily: 'inherit', opacity: isRecording ? 0 : 1 }} />
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
    </div>
  );
};

export default DirectMessagePage;