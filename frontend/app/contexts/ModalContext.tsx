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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={modalOptions.type === "alert" ? handleConfirm : handleCancel}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 transform transition-all">
            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {modalOptions.title}
            </h3>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              {modalOptions.message}
            </p>

            {/* Input field for prompt type */}
            {modalOptions.type === "prompt" && (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={modalOptions.placeholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
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
            <div className="flex gap-3">
              {modalOptions.type !== "alert" && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  {modalOptions.cancelText || "Cancel"}
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={modalOptions.type === "prompt" && !inputValue.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
