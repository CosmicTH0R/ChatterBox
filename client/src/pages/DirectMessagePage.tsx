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
  useEffect(() => {
    if (isInitialLoad) {
      // On initial load, scroll to bottom *instantly*
      messagesEndRef.current?.scrollIntoView();
    } else {
      // For new messages, scroll *smoothly* only if near the bottom
      const container = chatContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          200;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }, [messages, isInitialLoad]); // <-- Added isInitialLoad dependency

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
};

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4 font-inter">
      <Toaster position="top-center" />
      <div className="relative flex w-full max-w-7xl h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col grow w-full relative">
          {/* --- 7. UPDATED HEADER (FIXED) --- */}
          <div className="relative flex flex-col items-center p-4 border-b bg-white z-10">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => navigate("/conversations")}
                className="flex items-center justify-center rounded-lg text-sm font-semibold text-gray-700 bg-white shadow-sm border border-gray-300 hover:bg-gray-50 transition p-2 md:px-4 md:py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden md:inline md:ml-2">
                  Back to Conversations
                </span>
              </button>

              {/* --- HEADER CENTER (FIXED) --- */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {friendInfo
                      ? friendInfo.name || friendInfo.username
                      : "Direct Message"}
                  </h2>
                  {/* Blue dot shows if online (no longer hides) */}
                  {isFriendOnline && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  )}
                </div>

                {/* Subtext: "typing..." takes priority, then "Online" */}
                {isFriendTyping ? (
                  <span className="text-sm text-gray-500 italic h-4">
                    typing...
                  </span>
                ) : isFriendOnline ? (
                  <span className="text-sm text-gray-500 h-4">Online</span>
                ) : (
                  // Placeholder to prevent layout shift
                  <span className="h-4"></span>
                )}
              </div>

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
                                active ? "bg-gray-100" : ""
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

          {/* ... (Message Container - ref added) ... */}
          <div
            ref={chatContainerRef}
            className="grow p-4 overflow-y-auto bg-gray-50 flex flex-col"
          >
            {/* ... (Fixed Bubble Layout - UNCHANGED) ... */}
            <div className="space-y-4 grow">
              {messages.map((msg) => {
                const isMine = msg.user.username === currentUser;
                const isSystem = msg.user.username === "System";
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
                      {!isMine && !isSystem && (
                        <img
                          src={msg.user.avatarUrl || DEFAULT_AVATAR}
                          alt={msg.user.username}
                          className="shrink-0 w-10 h-10 rounded-full bg-gray-200 object-cover"
                          onError={(e) =>
                            (e.currentTarget.src = DEFAULT_AVATAR)
                          }
                        />
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
                          <div
                            className={`relative flex items-center ${
                              isMine ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            {isMine && (
                              <Menu.Button
                                className={`p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isMine ? "mr-2" : "ml-2"
                                }`}
                              >
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
                                <div className="mb-2">
                                  {renderMedia(msg, isMine)}
                                </div>
                              )}
                              {msg.text && (
                                <p
                                  className={`
                                  ${isJumbo ? "text-4xl" : ""}
                                  ${
                                    useSimpleLayout
                                      ? "whitespace-pre-line break-all"
                                      : "whitespace-pre-line"
                                  }
                                `}
                                >
                                  {msg.text}
                                </p>
                              )}
                              <span
                                className={`text-xs shrink-0 ${
                                  isMine ? "text-indigo-200" : "text-gray-400"
                                } ${
                                  useSimpleLayout ? "ml-2" : "mt-1 self-end"
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

          {/* ... (Scroll to Bottom Button - UNCHANGED) ... */}
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

          {/* ... (Message Input - UNCHANGED) ... */}
          <div className="p-4 bg-white border-t relative z-20">
            <Transition
              show={showEmojiPicker}
              as={Fragment}
              enter="transition-all duration-200 ease-out"
              enterFrom="opacity-0 scale-95 -translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="transition-all duration-150 ease-in"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-2"
            >
              <div className="absolute bottom-full mb-2">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  autoFocusSearch={false}
                  theme={Theme.LIGHT}
                />
              </div>
            </Transition>
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
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                disabled={isRecording}
              >
                <Smile className="w-5 h-5" />
              </button>
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
              <button
                type="button"
                onClick={handleCameraButtonClick}
                disabled={isUploading || isRecording}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <Camera className="w-5 h-5" />
              </button>
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
                    isRecording
                      ? "opacity-0 disabled:bg-gray-100"
                      : "disabled:bg-gray-100"
                  }`}
                />
              </div>
              {/* Conditional Send/Mic Button (New) */}
              {text.trim().length > 0 || fileToSend ? (
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
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ... (All Modals - UNCHANGED) ... */}
      <Transition appear show={isUnsendMyModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsUnsendMyModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold text-gray-900 flex items-center gap-2"
                  >
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
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      onClick={() => setIsUnsendMyModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
                      onClick={handleConfirmUnsendMyMessages}
                    >
                      Yes, Unsend All
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
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
            <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-bold text-gray-900"
                  >
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
                      <button
                        type="button"
                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        onClick={closeEditModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
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
      <MediaViewerModal
        isOpen={isMediaModalOpen}
        onClose={closeMediaModal}
        url={selectedMediaUrl}
        fileType={selectedMediaType}
      />
    </div>
  );
};

export default DirectMessagePage;