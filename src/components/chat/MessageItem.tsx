// ==============================================================================
// SecureTalk Message Item Component
// Renders decrypted message text, attachment decryptors, delivery status, and actions
// ==============================================================================

import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Reply,
  Copy,
  Trash2,
  File,
  Download,
  Loader2,
  Lock,
} from 'lucide-react';
import { chatService } from '../../services/chatService';
import type { DecryptedMessage } from '../../crypto/types';

interface MessageItemProps {
  message: DecryptedMessage;
  isMine: boolean;
  onReply: (msg: DecryptedMessage) => void;
  onDelete: (msgId: string) => void;
  onRetry?: (msg: DecryptedMessage) => void;
  currentUserId: string;
  partnerId: string;
  isFirstInGroup?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isMine,
  onReply,
  onDelete,
  onRetry,
  currentUserId,
  partnerId,
  isFirstInGroup = true,
}) => {
  const [copying, setCopying] = useState(false);
  const [decryptingAttachmentId, setDecryptingAttachmentId] = useState<string | null>(null);
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, { url: string; name: string; mime: string }>>({});

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopying(true);
    setTimeout(() => setCopying(false), 1500);
  };

  const handleDecryptAttachment = async (attachmentId: string) => {
    try {
      setDecryptingAttachmentId(attachmentId);
      const result = await chatService.downloadAndDecryptAttachment(
        attachmentId,
        message.conversationId,
        currentUserId,
        partnerId
      );
      setDecryptedUrls((prev) => ({
        ...prev,
        [attachmentId]: {
          url: result.blobUrl,
          name: result.fileName,
          mime: result.mimeType,
        },
      }));
    } catch (err) {
      alert('Failed to decrypt attachment. Verification error.');
    } finally {
      setDecryptingAttachmentId(null);
    }
  };

  const renderStatus = () => {
    if (!isMine) return null;

    switch (message.status) {
      case 'sending':
        return (
          <span title="Encrypting & sending..." className="inline-flex items-center">
            <Clock className="w-3 h-3 text-emerald-200 animate-pulse" />
          </span>
        );
      case 'sent':
        return (
          <span title="Sent to server" className="inline-flex items-center">
            <Check className="w-3 h-3 text-emerald-200/80" />
          </span>
        );
      case 'delivered':
        return (
          <span title="Delivered to recipient device" className="inline-flex items-center">
            <CheckCheck className="w-3 h-3 text-emerald-200" />
          </span>
        );
      case 'read':
        return (
          <span title="Read by recipient" className="inline-flex items-center">
            <CheckCheck className="w-3 h-3 text-emerald-200 font-bold" />
          </span>
        );
      case 'failed':
        return (
          <button
            onClick={() => onRetry && onRetry(message)}
            title="Failed to deliver. Click to retry."
            className="text-rose-300 hover:text-rose-100 flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px]">Retry</span>
          </button>
        );
      default:
        return null;
    }
  };

  const isDeleted = Boolean(message.deletedAt);

  return (
    <div
      className={`group relative flex flex-col mb-2 px-3 sm:px-4 ${
        isMine ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-md relative transition-all duration-150 ${
          isMine
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 text-white rounded-tr-sm border border-emerald-400/30 shadow-emerald-950/20'
            : 'bg-[#121826] border border-white/[0.08] text-slate-100 rounded-tl-sm shadow-black/20'
        } ${isDeleted ? 'opacity-60 italic' : ''}`}
      >
        {/* Reply Context Banner */}
        {message.replyToId && (
          <div className="mb-2 pl-2.5 border-l-2 border-emerald-400 text-[11px] text-emerald-100 bg-black/25 py-1 px-2 rounded-r">
            Replying to earlier message
          </div>
        )}

        {/* Message Plaintext */}
        <div className="break-words select-text whitespace-pre-wrap leading-relaxed text-[13.5px]">
          {message.text}
        </div>

        {/* Client-Side Encrypted Attachments */}
        {message.attachments && message.attachments.length > 0 && !isDeleted && (
          <div className="mt-2.5 space-y-2">
            {message.attachments.map((att) => {
              const decrypted = decryptedUrls[att.id];
              const isImage = att.mimeType.startsWith('image/') || (decrypted?.mime && decrypted.mime.startsWith('image/'));

              if (decrypted && isImage) {
                return (
                  <div key={att.id} className="rounded-xl overflow-hidden border border-white/[0.1] bg-black/40">
                    <img
                      src={decrypted.url}
                      alt={decrypted.name}
                      className="max-h-64 object-contain mx-auto rounded-t-xl"
                    />
                    <div className="p-2 flex items-center justify-between text-[11px] text-slate-300 bg-[#0d121c]/90">
                      <span className="truncate max-w-[200px]">{decrypted.name}</span>
                      <a
                        href={decrypted.url}
                        download={decrypted.name}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono text-[10px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>Save</span>
                      </a>
                    </div>
                  </div>
                );
              }

              if (decrypted) {
                return (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 p-2.5 bg-[#0c1018] border border-white/[0.08] rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <File className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="truncate text-slate-200">{decrypted.name}</span>
                    </div>
                    <a
                      href={decrypted.url}
                      download={decrypted.name}
                      className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </a>
                  </div>
                );
              }

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-200 block text-xs">
                        Encrypted File ({((att.fileSize || 0) / 1024).toFixed(0)} KB)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Stored ciphertext in bucket
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDecryptAttachment(att.id)}
                    disabled={decryptingAttachmentId === att.id}
                    className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1.5"
                  >
                    {decryptingAttachmentId === att.id ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Decrypting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 text-emerald-400" />
                        <span>Decrypt</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Metadata Footer: Timestamp & Delivery Status */}
        <div
          className={`mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-mono select-none ${
            isMine ? 'text-emerald-100/80' : 'text-slate-400'
          }`}
        >
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {renderStatus()}
        </div>
      </div>

      {/* Floating Hover Action Menu */}
      {!isDeleted && (
        <div
          className={`opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150 absolute -top-3 ${
            isMine ? 'right-[calc(70%+8px)]' : 'left-[calc(70%+8px)]'
          } hidden sm:flex items-center gap-0.5 bg-[#0e1422]/95 backdrop-blur-md border border-white/[0.1] rounded-lg px-1 py-0.5 shadow-xl shadow-black/40 z-10`}
        >
          <button
            onClick={() => onReply(message)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors"
            title="Reply to message"
            aria-label="Reply to message"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-md transition-colors"
            title={copying ? 'Copied' : 'Copy'}
            aria-label="Copy message text"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          {isMine && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
              title="Delete message"
              aria-label="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
