import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  fileType: string | null;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  url,
  fileType,
}) => {
  const renderMediaContent = () => {
    if (!url || !fileType) return null;

    // Use .startsWith() to handle "image" AND "image/png"
    if (fileType.startsWith('image')) {
      return (
        <img
          src={url}
          alt="Media content"
          className="max-w-full max-h-full object-contain"
        />
      );
    }

    // Use .startsWith() to handle "video" AND "video/mp4"
    if (fileType.startsWith('video')) {
      return (
        <video
          src={url}
          controls
          autoPlay
          className="max-w-full max-h-full object-contain"
        />
      );
    }
    
    return null; 
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
      >
        {/* The backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" />
        </Transition.Child>

        {/* Full-screen container to center the content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full w-full items-center justify-center p-4">
            
            {/* ################################################## */}
            {/* ### THIS IS THE FIX ### */}
            {/* The Transition.Child now has ONE child: Dialog.Panel */}
            {/* ################################################## */}

            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              {/* Make sure the panel is set to relative */}
              <Dialog.Panel className="relative w-auto h-auto max-w-[90vw] max-h-[90vh] flex items-center justify-center rounded-lg">
                
                {/* MOVED: The Close Button is now INSIDE the Dialog.Panel */}
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 z-50 p-2 text-white/80 bg-black/50 rounded-full hover:text-white"
                  aria-label="Close media viewer"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* The media content */}
                <div className="overflow-hidden rounded-lg">
                  {renderMediaContent()}
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default MediaViewerModal;