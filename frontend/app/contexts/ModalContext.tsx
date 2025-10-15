"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ModalType = "confirm" | "prompt" | "alert";

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  onConfirm?: (input?: string) => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showPrompt: (title: string, message: string, placeholder: string, onConfirm: (input: string) => void) => void;
  showAlert: (title: string, message: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);
  const [inputValue, setInputValue] = useState("");

  const showModal = useCallback((options: ModalOptions) => {
    setModalOptions(options);
    setInputValue("");
  }, []);

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    showModal({
      title,
      message,
      type: "confirm",
      confirmText: "Confirm",
      cancelText: "Cancel",
      onConfirm,
    });
  }, [showModal]);

  const showPrompt = useCallback((title: string, message: string, placeholder: string, onConfirm: (input: string) => void) => {
    showModal({
      title,
      message,
      type: "prompt",
      placeholder,
      confirmText: "Submit",
      cancelText: "Cancel",
      onConfirm: () => onConfirm(inputValue),
    });
  }, [showModal, inputValue]);

  const showAlert = useCallback((title: string, message: string) => {
    showModal({
      title,
      message,
      type: "alert",
      confirmText: "OK",
    });
  }, [showModal]);

  const handleConfirm = () => {
    if (modalOptions?.onConfirm) {
      if (modalOptions.type === "prompt") {
        modalOptions.onConfirm(inputValue);
      } else {
        modalOptions.onConfirm();
      }
    }
    setModalOptions(null);
    setInputValue("");
  };

  const handleCancel = () => {
    if (modalOptions?.onCancel) {
      modalOptions.onCancel();
    }
    setModalOptions(null);
    setInputValue("");
  };

  return (
    <ModalContext.Provider value={{ showModal, showConfirm, showPrompt, showAlert }}>
      {children}

      {/* Modal Component */}
      {modalOptions && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={modalOptions.type === "alert" ? handleConfirm : handleCancel}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {modalOptions.title}
            </h3>

            {/* Message */}
            <p className="text-sm text-gray-600 text-center mb-6">
              {modalOptions.message}
            </p>

            {/* Input field for prompt type */}
            {modalOptions.type === "prompt" && (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={modalOptions.placeholder}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all mb-6 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inputValue.trim()) {
                    handleConfirm();
                  } else if (e.key === "Escape") {
                    handleCancel();
                  }
                }}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              {modalOptions.type !== "alert" && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  {modalOptions.cancelText || "Cancel"}
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={modalOptions.type === "prompt" && !inputValue.trim()}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {modalOptions.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
