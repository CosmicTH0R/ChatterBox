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

    if (status.isSelf) {
      return (
        <p className="text-sm text-center text-gray-500">This is you!</p>
      );
    }

    if (status.isFriend) {
      return (
        <button
          onClick={handleSendMessage}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold text-white bg-indigo-600 shadow-md hover:bg-indigo-700 transition"
        >
          <MessageSquare className="w-5 h-5" />
          Send Message
        </button>
      );
    }

    if (status.isRequestSent) {
      return (
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold text-white bg-gray-400 cursor-not-allowed"
        >
          <Check className="w-5 h-5" />
          Request Sent
        </button>
      );
    }

    if (status.isRequestReceived) {
      return (
        <div className="flex gap-4">
          <button
            onClick={handleAcceptRequest}
            disabled={isSubmitting}
            className="grow flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition disabled:bg-green-400"
          >
            <UserCheck className="w-5 h-5" />
            Accept
          </button>
          <button
            onClick={handleRejectRequest}
            disabled={isSubmitting}
            className="grow flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:bg-red-400"
          >
            <UserX className="w-5 h-5" />
            Reject
          </button>
        </div>
      );
    }

    // Default: Not friends, no requests
    return (
      <button
        onClick={handleAddFriend}
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold text-white bg-blue-600 shadow-md hover:bg-blue-700 transition disabled:bg-blue-400"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <UserPlus className="w-5 h-5" />
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
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left align-middle shadow-xl transition-all">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>

                {isLoading ? (
                  <div className="flex justify-center items-center h-48">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                  </div>
                ) : user ? (
                  <>
                    {/* User Info */}
                    <div className="flex flex-col items-center mt-4">
                      <img
                        src={user.avatarUrl || DEFAULT_AVATAR}
                        alt={user.username}
                        className="w-24 h-24 rounded-full bg-gray-200 object-cover border-4 border-white shadow-lg"
                        onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                      />
                      <Dialog.Title
                        as="h3"
                        className="mt-4 text-2xl font-bold text-gray-900"
                      >
                        {user.name || user.username}
                      </Dialog.Title>
                      {user.name && (
                        <p className="text-gray-500">@{user.username}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8">{renderActionButtons()}</div>
                  </>
                ) : (
                  // Error state (if loading fails, though useEffect handles most of this)
                  <div className="flex flex-col items-center h-48 justify-center text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                    <p className="mt-4 text-gray-600">
                      Could not load user profile.
                    </p>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UserInfoModal;