import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { AUTH_TOKEN_KEY, apiClient } from "../../../services/apiClient";
import { getApiBaseUrl } from "../../../services/runtimeConfig";
import {
  getChatSocket,
  connectChatSocket,
  disconnectChatSocket,
} from "../../../services/chatSocket";
import { useAuthStore } from "../../../stores/authStore";

type ChatAttachment = {
  id: string;
  originalName?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt?: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderUserId?: string;
  senderEmail: string;
  body?: string | null;
  createdAt: string;
  attachments?: ChatAttachment[];
};

type ChatConversation = {
  id: string;
  subject: string;
  participantEmails: string[];
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
};

type ChatWorkspaceProps = {
  contextLabel: string;
  recipientPlaceholder: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(value: string) {
  return (
    value
      .split("@")[0]
      .split(/[._\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CH"
  );
}

function attachmentName(attachment: ChatAttachment) {
  return attachment.originalName || attachment.filename || "Attachment";
}

function formatSize(size?: number) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function isImageAttachment(attachment: ChatAttachment) {
  const mime = attachment.mimeType || "";
  const name = attachmentName(attachment).toLowerCase();
  return (
    mime.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => name.endsWith(ext))
  );
}

function attachmentUrl(attachmentId: string) {
  const apiUrl = getApiBaseUrl();
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${apiUrl.replace(/\/$/, "")}/chat/attachments/${attachmentId}/download${query}`;
}

/* ============================================================ */

export function ChatWorkspace({ contextLabel, recipientPlaceholder }: ChatWorkspaceProps) {
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const [reply, setReply] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [typingEmail, setTypingEmail] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const prevSelectedIdRef = useRef<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------- helpers ---------- */

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 4000);
  }, []);

  /* ---------- data ---------- */

  const openConversation = useCallback(
    async (conversation: ChatConversation) => {
      setError("");
      setLoadingMessages(true);
      activeConversationIdRef.current = conversation.id;

      const socket = getChatSocket();
      if (prevSelectedIdRef.current && prevSelectedIdRef.current !== conversation.id) {
        socket.emit("chat:leave", prevSelectedIdRef.current);
      }
      prevSelectedIdRef.current = conversation.id;

      setSelectedConversation(conversation);
      setUnreadIds((prev) => {
        const next = new Set(prev);
        next.delete(conversation.id);
        return next;
      });

      try {
        const response = await apiClient.get<{
          conversation: ChatConversation;
          messages: ChatMessage[];
        }>(`/chat/conversations/${conversation.id}/messages`);

        // guard against race: user may have clicked another conv while this loaded
        if (activeConversationIdRef.current !== conversation.id) return;

        setSelectedConversation(response.data.conversation);
        setMessages(response.data.messages);
        socket.emit("chat:join", conversation.id);
        scrollToBottom("auto");
      } catch (err: any) {
        if (activeConversationIdRef.current === conversation.id) {
          setError(err?.response?.data?.message || "Unable to open conversation.");
        }
      } finally {
        if (activeConversationIdRef.current === conversation.id) {
          setLoadingMessages(false);
        }
      }
    },
    [scrollToBottom]
  );

  const loadConversations = useCallback(
    async (keepSelection = false) => {
      setLoadingConversations(true);
      setError("");

      try {
        const response = await apiClient.get<{ conversations: ChatConversation[] }>("/chat/conversations");
        const list = response.data.conversations;
        setConversations(list);

        if (!keepSelection && list.length > 0) {
          await openConversation(list[0]);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Unable to load conversations.");
      } finally {
        setLoadingConversations(false);
      }
    },
    [openConversation]
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /* ---------- start conversation ---------- */

  async function startConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const email = recipientEmail.trim();
    const subj = subject.trim() || "New conversation";
    const msg = firstMessage.trim();

    if (!email || !email.includes("@")) {
      setError("Enter a valid recipient email.");
      return;
    }
    if (!msg) {
      setError("First message is required.");
      return;
    }

    setIsStarting(true);
    try {
      const response = await apiClient.post<{ conversation: ChatConversation }>("/chat/conversations", {
        recipientEmail: email,
        subject: subj,
        message: msg,
      });

      setRecipientEmail("");
      setSubject("");
      setFirstMessage("");
      setShowComposer(false);
      setNotice("Conversation started.");
      clearNotice();

      await loadConversations(true);
      await openConversation(response.data.conversation);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to start conversation.");
    } finally {
      setIsStarting(false);
    }
  }

  /* ---------- send message ---------- */

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedConversation) return;

    const bodyText = reply.trim();
    if (!bodyText && files.length === 0) {
      setError("Message or file is required.");
      return;
    }

    setError("");
    setNotice("");
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append("body", bodyText);
      files.forEach((file) => formData.append("files", file));

      const response = await apiClient.post<{ message: ChatMessage }>(
        `/chat/conversations/${selectedConversation.id}/messages`,
        formData
      );

      setMessages((current) => [...current, response.data.message]);
      setReply("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      scrollToBottom();

      getChatSocket().emit("chat:typing", {
        conversationId: selectedConversation.id,
        typing: false,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  /* ---------- socket lifecycle ---------- */

  useEffect(() => {
    const socket = connectChatSocket();

    function handleConnect() {
      const id = activeConversationIdRef.current;
      if (id) {
        socket.emit("chat:join", id);
      }
    }

    function handleNewConversation(conversation: ChatConversation) {
      setConversations((current) => {
        if (current.some((item) => item.id === conversation.id)) return current;
        return [conversation, ...current];
      });
      setUnreadIds((prev) => {
        const next = new Set(prev);
        next.add(conversation.id);
        return next;
      });
      setNotice("New conversation received.");
      clearNotice();
    }

    function handleConversationUpdate(conversation: ChatConversation) {
      setConversations((current) => {
        const exists = current.some((item) => item.id === conversation.id);
        const next = exists
          ? current.map((item) => (item.id === conversation.id ? conversation : item))
          : [conversation, ...current];
        return next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      // mark unread if update is for a non-selected conversation
      setUnreadIds((prev) => {
        if (activeConversationIdRef.current === conversation.id) return prev;
        const next = new Set(prev);
        next.add(conversation.id);
        return next;
      });
    }

    function handleNewMessage(message: ChatMessage) {
      const selectedId = activeConversationIdRef.current;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        if (selectedId && message.conversationId !== selectedId) return current;
        return [...current, message];
      });

      if (message.conversationId === selectedId) {
        scrollToBottom();
      } else {
        setUnreadIds((prev) => {
          const next = new Set(prev);
          next.add(message.conversationId);
          return next;
        });
      }
    }

    function handleTyping(payload: { conversationId: string; email: string; typing: boolean }) {
      if (payload.email === user?.email) return;
      if (activeConversationIdRef.current !== payload.conversationId) return;
      setTypingEmail(payload.typing ? payload.email : "");
    }

    socket.on("connect", handleConnect);
    socket.on("chat:conversation:new", handleNewConversation);
    socket.on("chat:conversation:update", handleConversationUpdate);
    socket.on("chat:message:new", handleNewMessage);
    socket.on("chat:typing", handleTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("chat:conversation:new", handleNewConversation);
      socket.off("chat:conversation:update", handleConversationUpdate);
      socket.off("chat:message:new", handleNewMessage);
      socket.off("chat:typing", handleTyping);
      disconnectChatSocket();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [selectedConversation?.id, user?.email, scrollToBottom, clearNotice]);

  /* ---------- typing debounce ---------- */

  function handleReplyChange(value: string) {
    setReply(value);
    if (error) setError("");

    if (!selectedConversation) return;
    const socket = getChatSocket();
    socket.emit("chat:typing", {
      conversationId: selectedConversation.id,
      typing: Boolean(value.trim()),
    });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("chat:typing", {
        conversationId: selectedConversation.id,
        typing: false,
      });
    }, 3000);
  }

  /* ---------- derived ---------- */

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((c) =>
      [c.subject, c.participantEmails.join(" "), c.messages?.[0]?.body]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, searchText]);

  const composerVisible = conversations.length === 0 || showComposer;

  /* ---------- render ---------- */

  return (
    <section className="aw-design-page aw-mobile-page chat-workspace">
      {error ? (
        <div className="chat-alert chat-alert-error">
          {error}
          <button type="button" className="chat-alert-close" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="chat-alert chat-alert-notice">
          {notice}
          <button type="button" className="chat-alert-close" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="chat-layout">
        {/* ---- sidebar ---- */}
        <aside className={["chat-sidebar", selectedConversation ? "chat-sidebar-has-selection" : ""].join(" ")}>
          <div className="chat-sidebar-header">
            <div>
              <h1>Conversations</h1>
              <p>Start by email and continue {contextLabel} communication here.</p>
            </div>
            {conversations.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowComposer((s) => !s)}
                className="chat-new-button"
              >
                {showComposer ? <X size={14} /> : <Plus size={14} />}
                New
              </button>
            ) : null}
          </div>

          <div className="chat-search">
            <Search size={15} />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search conversations"
            />
          </div>

          <div className="chat-conversation-list">
            {loadingConversations ? (
              <div className="chat-empty-sidebar">
                <Loader2 size={28} className="chat-spinner" />
                <p>Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="chat-empty-sidebar">
                <MessageSquare size={32} />
                <p>No conversations yet.</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const active = selectedConversation?.id === conversation.id;
                const lastMessage = conversation.messages?.[0];
                const hasUnread = unreadIds.has(conversation.id) && !active;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void openConversation(conversation)}
                    className={["chat-conversation-item", active ? "is-active" : ""].join(" ")}
                  >
                    <span className="chat-avatar">
                      {initials(conversation.participantEmails[0] || "CH")}
                    </span>

                    <span className="chat-conversation-text">
                      <strong>
                        {conversation.subject}
                        {hasUnread ? <span className="chat-unread-dot" /> : null}
                      </strong>
                      <small>{conversation.participantEmails.join(", ")}</small>
                      <em>{lastMessage?.body || "No messages yet."}</em>
                      {lastMessage ? <time>{formatTime(lastMessage.createdAt)}</time> : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- main ---- */}
        <main className={["chat-main", selectedConversation ? "has-selection" : ""].join(" ")}>
          {selectedConversation ? (
            <>
              <header className="chat-main-header">
                <button
                  type="button"
                  className="chat-mobile-back-button"
                  onClick={() => {
                    setSelectedConversation(null);
                    setMessages([]);
                    activeConversationIdRef.current = null;
                  }}
                >
                  Conversations
                </button>

                <p>Active conversation</p>
                <h2>{selectedConversation.subject}</h2>
                <span>{selectedConversation.participantEmails.join(", ")}</span>
              </header>

              <div className="chat-messages-container">
                {loadingMessages ? (
                  <div className="chat-empty-main">
                    <Loader2 size={32} className="chat-spinner" />
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-main">
                    <MessageSquare size={32} />
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderEmail === user?.email;

                    return (
                      <div key={message.id} className={["message-row", mine ? "mine" : "theirs"].join(" ")}>
                        <div className={["chat-bubble", mine ? "mine" : "theirs"].join(" ")}>
                          <div className="message-meta">
                            <span>{message.senderEmail}</span>
                            <span>{formatDate(message.createdAt)}</span>
                          </div>

                          {message.body ? <div className="message-text">{message.body}</div> : null}

                          {message.attachments && message.attachments.length > 0 ? (
                            <div className="message-attachments">
                              {message.attachments.map((attachment) => {
                                const url = attachmentUrl(attachment.id);
                                const image = isImageAttachment(attachment);

                                return (
                                  <div key={attachment.id} className="message-attachment">
                                    {image ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="message-image-link"
                                      >
                                        <img src={url} alt={attachmentName(attachment)} loading="lazy" />
                                      </a>
                                    ) : null}

                                    <a href={url} target="_blank" rel="noreferrer" className="message-file-link">
                                      {image ? <ImageIcon size={15} /> : <FileText size={15} />}
                                      <span>{attachmentName(attachment)}</span>
                                      <small>{formatSize(attachment.sizeBytes)}</small>
                                      <Download size={14} />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}

                {typingEmail ? <p className="chat-typing">{typingEmail} is typing...</p> : null}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="chat-composer">
                <textarea
                  value={reply}
                  onChange={(e) => handleReplyChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!isSending && (reply.trim() || files.length > 0)) {
                        void sendMessage(e as any);
                      }
                    }
                  }}
                  placeholder="Write a reply"
                  rows={2}
                />

                {files.length > 0 ? (
                  <div className="chat-selected-files">
                    {files.map((file, index) => (
                      <span key={`${file.name}-${index}`}>
                        {file.name}
                        <button
                          type="button"
                          onClick={() => {
                            setFiles((current) => current.filter((_, i) => i !== index));
                            if (files.length <= 1 && fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="chat-composer-actions">
                  <label className="chat-attach-button">
                    <Paperclip size={15} />
                    Attach files
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                  </label>

                  <button type="submit" disabled={isSending || (!reply.trim() && files.length === 0)} className="chat-send-button">
                    <Send size={15} />
                    {isSending ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-empty-main">
              <MessageSquare size={42} />
              <h2>Select a conversation</h2>
              <p>Choose a conversation from the list or start one by email.</p>
            </div>
          )}
        </main>

        {/* ---- start panel ---- */}
        {composerVisible ? (
          <aside className={["chat-start-panel", composerVisible ? "is-visible" : ""].join(" ")}>
            <div className="chat-start-header">
              <Plus size={17} />
              <h2>Start chat by email</h2>
            </div>

            <form onSubmit={startConversation} className="form-grid chat-start-form">
              <label>
                <span>Recipient email</span>
                <div>
                  <Mail size={15} />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder={recipientPlaceholder}
                    required
                  />
                </div>
              </label>

              <label>
                <span>Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Conversation subject"
                />
              </label>

              <label>
                <span>First message</span>
                <textarea
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Write the first message"
                  required
                  rows={4}
                />
              </label>

              <button type="submit" disabled={isStarting}>
                <Send size={15} />
                {isStarting ? "Starting..." : "Start Conversation"}
              </button>
            </form>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
