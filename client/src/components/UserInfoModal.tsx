import React, { useState, useEffect, Fragment } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import {
  X,
  Loader2,
  UserPlus,
  MessageSquare,
  Check,
  UserCheck,
  UserX,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- INTERFACES ---
interface UserInfo {
  _id: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface FriendshipStatus {
  isSelf: boolean;
  isFriend: boolean;
  isRequestSent: boolean;
  isRequestReceived: boolean;
}

interface UserInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onStatusChange?: () => void; // A function to tell the parent page to refetch data
}

// --- DEFAULT AVATAR ---
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/bottts/svg';

const UserInfoModal: React.FC<UserInfoModalProps> = ({
  isOpen,
  onClose,
  userId,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // --- STATE ---
  const [user, setUser] = useState<UserInfo | null>(null);
  const [status, setStatus] = useState<FriendshipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (isOpen && userId) {
      const fetchUserData = async () => {
        setIsLoading(true);
        try {
          const { data } = await axios.get(
            `${API_URL}/api/users/public/${userId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setUser(data.user);
          setStatus(data.status);
        } catch (err) {
          console.error('Failed to fetch user data', err);
          toast.error('Could not load user profile.');
          onClose(); // Close modal if user can't be loaded
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, [isOpen, userId, token, API_URL]); // Refetch when modal opens or userId changes

  // --- API HANDLERS ---
  const handleAddFriend = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/friends/send`,
        { username: user.username },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Friend request sent!');
      setStatus({ ...status!, isRequestSent: true }); // Update status locally
      onStatusChange?.(); // Tell parent to refetch
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/friends/accept`,
        { requestId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Friend request accepted!');
      setStatus({ ...status!, isFriend: true, isRequestReceived: false });
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/api/friends/reject`,
        { requestId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Friend request rejected.');
      setStatus({ ...status!, isRequestReceived: false });
      onStatusChange?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = () => {
    if (!user) return;
    onClose(); // Close modal first
    navigate(`/dm/${user._id}`); // Then navigate
  };

  // --- RENDER ACTION BUTTONS ---
  const renderActionButtons = () => {
    if (!status) return null;

    const btnBase = "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded text-[14px] font-medium transition-all duration-200 active:scale-[0.98]";

    if (status.isSelf) {
      return (
        <p className="text-xs text-center text-[var(--dc-text-muted)] italic">This is you!</p>
      );
    }

    if (status.isFriend) {
      return (
        <button
          onClick={handleSendMessage}
          className={`${btnBase} text-white bg-[var(--dc-accent)] hover:bg-[var(--dc-accent-hover)] shadow-lg shadow-[var(--dc-accent)]/10`}
        >
          <MessageSquare className="w-4 h-4" />
          Send Message
        </button>
      );
    }

    if (status.isRequestSent) {
      return (
        <button
          disabled
          className={`${btnBase} text-[var(--dc-text-muted)] bg-[var(--dc-bg-active)] border border-[var(--dc-border)] cursor-not-allowed`}
        >
          <Check className="w-4 h-4" />
          Request Sent
        </button>
      );
    }

    if (status.isRequestReceived) {
      return (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAcceptRequest}
            disabled={isSubmitting}
            className={`${btnBase} text-white bg-[var(--dc-online)] hover:opacity-90 disabled:opacity-50`}
          >
            <UserCheck className="w-4 h-4" />
            Accept Request
          </button>
          <button
            onClick={handleRejectRequest}
            disabled={isSubmitting}
            className={`${btnBase} text-[var(--dc-text-normal)] bg-[var(--dc-bg-secondary)] border border-[var(--dc-border)] hover:bg-[var(--dc-bg-active)] disabled:opacity-50`}
          >
            <UserX className="w-4 h-4" />
            Ignore
          </button>
        </div>
      );
    }

    // Default: Not friends, no requests
    return (
      <button
        onClick={handleAddFriend}
        disabled={isSubmitting}
        className={`${btnBase} text-white bg-[var(--dc-accent)] hover:bg-[var(--dc-accent-hover)] shadow-lg shadow-[var(--dc-accent)]/10 disabled:opacity-50`}
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {isSubmitting ? 'Sending...' : 'Add Friend'}
      </button>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        {/* Modal Content */}
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-xl bg-[var(--dc-bg-tertiary)] text-left align-middle shadow-2xl transition-all border border-[var(--dc-border)]">
                {/* Profile Banner */}
                <div className="h-24 w-full bg-[var(--dc-accent)] opacity-80" />

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10 p-1 bg-black/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="px-6 pb-8">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="w-10 h-10 animate-spin text-[var(--dc-accent)]" />
                    </div>
                  ) : user ? (
                    <>
                      {/* Avatar & Info */}
                      <div className="relative flex flex-col items-start -mt-12">
                        <div className="relative">
                          <img
                            src={user.avatarUrl || DEFAULT_AVATAR}
                            alt={user.username}
                            className="w-24 h-24 rounded-full bg-[var(--dc-bg-active)] object-cover border-[6px] border-[var(--dc-bg-tertiary)] shadow-xl"
                            onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                          />
                          <span className="absolute bottom-1 right-1 w-6 h-6 bg-[var(--dc-online)] border-[4px] border-[var(--dc-bg-tertiary)] rounded-full" />
                        </div>
                        
                        <div className="mt-4 w-full p-4 rounded-lg bg-[var(--dc-bg-primary)] border border-[var(--dc-border-light)]">
                          <Dialog.Title
                            as="h3"
                            className="text-xl font-bold text-[var(--dc-text-white)]"
                          >
                            {user.name || user.username}
                          </Dialog.Title>
                          <p className="text-[var(--dc-text-muted)] text-sm font-medium">@{user.username}</p>
                          
                          <div className="mt-4 pt-4 border-t border-[var(--dc-border-light)]">
                            <h4 className="text-[var(--dc-text-muted)] text-[11px] font-bold uppercase tracking-wider mb-2">Member Since</h4>
                            <p className="text-[var(--dc-text-normal)] text-xs">Chatterbox Community Member</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-6">{renderActionButtons()}</div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center h-48 justify-center text-center">
                      <AlertTriangle className="w-10 h-10 text-[var(--dc-danger)]" />
                      <p className="mt-4 text-[var(--dc-text-normal)]">
                        Could not load user profile.
                      </p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UserInfoModal;