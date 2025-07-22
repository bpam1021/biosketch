import React from "react";

interface ModalProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const CreditDetailModal: React.FC<ModalProps> = ({ title, onClose, children }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 text-2xl font-bold transition"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 overflow-y-auto max-h-[75vh]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CreditDetailModal;
