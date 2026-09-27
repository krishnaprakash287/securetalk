// ==============================================================================
// SecureTalk Message Composer Component
// Input area, file attachment encryption trigger, typing indicator dispatcher
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, File, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { validateAttachment, MAX_ATTACHMENT_SIZE_BYTES } from '../../crypto/attachment';
import type { DecryptedMessage } from '../../crypto/types';

interface MessageComposerProps {
  onSendMessage: (text: string, file?: File | null) => Promise<void>;
  replyingTo: DecryptedMessage | null;
  onCancelReply: () => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTyping,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Typing indicator
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file format.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;
    if (sending) return;

    try {
      setSending(true);
      setError(null);
      onTyping(false);

      await onSendMessage(trimmed, selectedFile);

      setText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replyingTo) onCancelReply();
      textareaRef.current?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to send encrypted message. Please retry.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/[0.07] bg-[#0a0e17]/95 backdrop-blur-md p-3 sm:p-4 select-none">
      {/* Error feedback */}
      {error && (
        <div className="mb-2.5 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-rose-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="mb-2.5 p-2.5 bg-[#101726] border border-white/[0.08] rounded-xl flex items-center justify-between text-xs shadow-inner">
          <div className="truncate pr-3">
            <span className="text-emerald-400 font-semibold">Replying to: </span>
            <span className="text-slate-300 truncate">{replyingTo.text}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.05]"
            aria-label="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment selected badge */}
      {selectedFile && (
        <div className="mb-2.5 p-2.5 bg-[#0e1726] border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs shadow-inner">
          <div className="flex items-center gap-2 truncate">
            <Lock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="font-mono text-slate-200 truncate font-medium">{selectedFile.name}</span>
            <span className="text-slate-400 text-[10px]">
              ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
            </span>
          </div>
          <button
            onClick={handleRemoveFile}
            className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-white/[0.05]"
            aria-label="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input controls */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf,.txt,.doc,.docx,.zip,.csv"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          className="p-3 text-slate-400 hover:text-emerald-400 hover:bg-white/[0.05] rounded-xl transition-all border border-white/[0.08] hover:border-emerald-500/30 flex-shrink-0"
          title="Attach encrypted file (Images, PDF, Documents up to 50 MB)"
          aria-label="Attach file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || sending}
            rows={1}
            placeholder="Type encrypted message... (Enter to send, Shift+Enter for newline)"
            className="w-full resize-none px-4 py-2.5 bg-[#0e1422] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 max-h-36 leading-relaxed transition-all shadow-inner"
          />
        </div>

        {/* Encrypted Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || sending || (!text.trim() && !selectedFile)}
          className="btn-primary p-3 rounded-xl flex-shrink-0"
          title="Encrypt and send"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2.5 px-1">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Client-side AES-256-GCM • 96-bit CSPRNG Nonce</span>
        </span>
        <span className="text-slate-500">Max file: 50 MB</span>
      </div>
    </div>
  );
};
