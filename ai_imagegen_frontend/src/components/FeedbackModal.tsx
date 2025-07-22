import React, { useState, useEffect, useRef } from "react";
import { submitFeedback } from "../api/profileApi";
import { toast } from "react-toastify";
import { FiX, FiSend, FiMail, FiUser, FiMessageSquare, FiCheckCircle } from "react-icons/fi";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onClose,
  defaultName = "",
  defaultEmail = "",
}) => {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Autofocus first input when modal opens
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset fields if modal is re-opened
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setEmail(defaultEmail);
      setMessage("");
      setSubmitting(false);
      setSuccess(false);
    }
  }, [open, defaultName, defaultEmail]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedback({ name, email, message });
      setSuccess(true);
      setTimeout(() => {
        toast.success("Thank you for your feedback!");
        onClose();
      }, 1200);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to send feedback."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white/90 rounded-3xl shadow-2xl max-w-md w-full mx-4 px-8 py-9 animate-slideUp border border-blue-100"
           style={{ backdropFilter: "blur(8px)" }}>
        {/* Close button */}
        <button
          className="absolute top-5 right-5 text-gray-400 hover:text-red-500 transition-colors text-2xl"
          onClick={onClose}
          aria-label="Close"
          disabled={submitting}
          tabIndex={0}
        >
          <FiX />
        </button>
        {/* Hero icon */}
        <div className="flex items-center justify-center mb-2">
          <div className="bg-gradient-to-tr from-blue-200 to-blue-400 rounded-full p-4 shadow-inner">
            <FiMessageSquare className="text-blue-600 text-3xl" />
          </div>
        </div>
        {/* Title & subtitle */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-1 tracking-tight">We value your feedback</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Please let us know your thoughts, ideas, or problems. We’re listening!
        </p>
        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <FiCheckCircle className="text-green-500 text-5xl animate-popIn" />
            <div className="text-lg font-semibold text-green-600">Feedback sent!</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <label
                className="block text-gray-700 font-medium mb-1"
                htmlFor="feedback-name"
              >
                Name
              </label>
              <span className="absolute left-3 top-9 text-gray-400">
                <FiUser />
              </span>
              <input
                id="feedback-name"
                className="w-full border rounded-xl p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/40 text-gray-800 placeholder-gray-400 transition"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                required
                disabled={submitting}
                ref={nameInputRef}
                autoComplete="name"
              />
            </div>
            <div className="relative">
              <label
                className="block text-gray-700 font-medium mb-1"
                htmlFor="feedback-email"
              >
                Email
              </label>
              <span className="absolute left-3 top-9 text-gray-400">
                <FiMail />
              </span>
              <input
                id="feedback-email"
                type="email"
                className="w-full border rounded-xl p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/40 text-gray-800 placeholder-gray-400 transition"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
                autoComplete="email"
              />
            </div>
            <div className="relative">
              <label
                className="block text-gray-700 font-medium mb-1"
                htmlFor="feedback-message"
              >
                Feedback
              </label>
              <span className="absolute left-3 top-9 text-gray-400">
                <FiSend />
              </span>
              <textarea
                id="feedback-message"
                className="w-full border rounded-xl p-2 pl-10 min-h-[90px] resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-50/40 text-gray-800 placeholder-gray-400 transition"
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                disabled={submitting}
                placeholder="Let us know how we can improve, or what you love!"
                maxLength={2000}
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="px-5 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-700 font-medium transition"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl hover:from-blue-600 hover:to-blue-800 shadow font-semibold transition flex items-center gap-2"
                disabled={submitting}
              >
                <FiSend />
                {submitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Animations */}
      <style>
        {`
          .animate-fadeIn { animation: fadeIn .22s ease; }
          .animate-slideUp { animation: slideUp .28s cubic-bezier(.6,.5,.4,1); }
          @keyframes fadeIn {
            from { opacity: 0 }
            to   { opacity: 1 }
          }
          @keyframes slideUp {
            from { transform: translateY(60px); opacity:0 }
            to   { transform: translateY(0); opacity:1 }
          }
          .animate-popIn {
            animation: popIn .6s cubic-bezier(.5,1.7,.36,.81);
          }
          @keyframes popIn {
            0% { transform: scale(0.8); opacity: 0; }
            60% { transform: scale(1.15); opacity: 1;}
            100% { transform: scale(1); opacity: 1;}
          }
        `}
      </style>
    </div>
  );
};

export default FeedbackModal;
