import { useEffect, useRef, useState, useCallback } from "react";
import {
  FileText,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  X,
  ArrowLeft
} from "lucide-react";
import { AUTH_TOKEN_KEY, apiClient } from "../../../services/apiClient";
import { getApiBaseUrl } from "../../../services/runtimeConfig";
import {
  getChatSocket,
  connectChatSocket,
  disconnectChatSocket,
} from "../../../services/chatSocket";
import { useAuthStore } from "../../../store/authStore";

type ChatAttachment = { id: string; originalName?: string; filename?: string; mimeType?: string; sizeBytes?: number; createdAt?: string; };
type ChatMessage = { id: string; conversationId: string; senderUserId?: string; senderEmail: string; body?: string | null; createdAt: string; attachments?: ChatAttachment[]; };
type ChatConversation = { id: string; subject: string; participantEmails: string[]; createdAt: string; updatedAt: string; messages?: ChatMessage[]; };
type ChatWorkspaceProps = { contextLabel?: string; recipientPlaceholder: string; };

function formatTime(v?: string | null) { return v ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(v)) : ""; }
function initials(v: string) { return v.split("@")[0].split(/[._\-\s]+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "CH"; }
function attachmentName(a: ChatAttachment) { return a.originalName || a.filename || "Attachment"; }
function attachmentUrl(id: string) { const api = getApiBaseUrl(); const token = localStorage.getItem(AUTH_TOKEN_KEY); const q = token ? `?token=${encodeURIComponent(token)}` : ""; return `${api.replace(/\/$/, "")}/chat/attachments/${id}/download${q}`; }

export function ChatWorkspace({ recipientPlaceholder }: ChatWorkspaceProps) {
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
  const [error, setError] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

  const endRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const prevIdRef = useRef<string | null>(null);

  const scroll = useCallback(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), []);

  const openConversation = useCallback(async (conv: ChatConversation) => {
    setError(""); setLoadingMessages(true); activeIdRef.current = conv.id;
    const socket = getChatSocket();
    if (prevIdRef.current && prevIdRef.current !== conv.id) socket.emit("chat:leave", prevIdRef.current);
    prevIdRef.current = conv.id; setSelectedConversation(conv);
    setUnreadIds(p => { const n = new Set(p); n.delete(conv.id); return n; });
    try {
      const res = await apiClient.get<{ conversation: ChatConversation; messages: ChatMessage[] }>(`/chat/conversations/${conv.id}/messages`);
      if (activeIdRef.current !== conv.id) return;
      setSelectedConversation(res.data.conversation); setMessages(res.data.messages);
      socket.emit("chat:join", conv.id); setTimeout(scroll, 100);
    } catch { setError("Failed to load messages."); } finally { if (activeIdRef.current === conv.id) setLoadingMessages(false); }
  }, [scroll]);

  const loadConversations = useCallback(async (keep = false) => {
    setLoadingConversations(true);
    try {
      const res = await apiClient.get<{ conversations: ChatConversation[] }>("/chat/conversations");
      const list = res.data.conversations; setConversations(list);
      if (!keep && list.length > 0) openConversation(list[0]);
    } catch { setError("Failed to load conversations."); } finally { setLoadingConversations(false); }
  }, [openConversation]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  async function startConversation(e: React.FormEvent) {
    e.preventDefault(); if (!recipientEmail || !firstMessage) return;
    setIsStarting(true);
    try {
      const res = await apiClient.post<{ conversation: ChatConversation }>("/chat/conversations", { recipientEmail, subject: subject || "New chat", message: firstMessage });
      setRecipientEmail(""); setSubject(""); setFirstMessage(""); setShowComposer(false);
      await loadConversations(true); await openConversation(res.data.conversation);
    } catch { setError("Failed to start conversation."); } finally { setIsStarting(false); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault(); if (!selectedConversation || (!reply.trim() && !files.length)) return;
    setIsSending(true);
    try {
      const fd = new FormData(); fd.append("body", reply); files.forEach(f => fd.append("files", f));
      const res = await apiClient.post<{ message: ChatMessage }>(`/chat/conversations/${selectedConversation.id}/messages`, fd);
      setMessages(c => [...c, res.data.message]); setReply(""); setFiles([]); scroll();
    } catch { setError("Failed to send message."); } finally { setIsSending(false); }
  }

  useEffect(() => {
    const socket = connectChatSocket();
    socket.on("chat:conversation:new", (c: ChatConversation) => { setConversations(cur => [c, ...cur]); setUnreadIds(p => new Set(p).add(c.id)); });
    socket.on("chat:message:new", (m: ChatMessage) => {
      if (m.conversationId === activeIdRef.current) { setMessages(c => [...c, m]); scroll(); }
      else setUnreadIds(p => new Set(p).add(m.conversationId));
    });
    return () => { disconnectChatSocket(); };
  }, [scroll]);

  const filtered = conversations.filter(c => !searchText || c.subject.toLowerCase().includes(searchText.toLowerCase()) || c.participantEmails.some(e => e.toLowerCase().includes(searchText.toLowerCase())));

  return (
    <div className="aw-chat-page flex-1 flex flex-col h-[calc(100dvh-140px)] min-h-0">
      {error && (
        <div className="mb-4 aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4 h-full min-h-0">
        <aside className={["aw-panel flex flex-col min-h-0", selectedConversation ? "hidden lg:flex" : "flex"].join(" ")}>
          <header className="p-5 border-b border-[var(--aw-border-soft)] flex justify-between items-center bg-[var(--aw-surface-muted)]">
            <h2 className="font-black text-sm uppercase tracking-widest">Inbox</h2>
            <button onClick={() => setShowComposer(!showComposer)} className="aw-btn aw-btn-primary !min-h-[32px] !px-2"><Plus size={16}/></button>
          </header>
          <div className="p-3"><div className="aw-search-wrap !min-h-[36px]"><Search size={14}/><input className="aw-search-input" placeholder="Search chats..." value={searchText} onChange={e => setSearchText(e.target.value)}/></div></div>
          <div className="flex-1 overflow-y-auto aw-seamless-scroll p-2 space-y-1">
             {loadingConversations ? <div className="p-10 text-center text-xs font-bold opacity-40">Loading...</div> : filtered.map(c => (
               <button key={c.id} onClick={() => openConversation(c)} className={["w-full p-4 rounded-2xl border text-left transition-all flex gap-3", selectedConversation?.id === c.id ? "border-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/20" : "border-transparent hover:bg-[var(--aw-bg)]"].join(" ")}>
                  <div className="h-10 w-10 rounded-full bg-[var(--aw-primary)] flex items-center justify-center text-white font-black text-xs flex-shrink-0">{initials(c.participantEmails[0])}</div>
                  <div className="min-w-0 flex-1">
                     <div className="flex justify-between items-start"><p className="font-black text-sm truncate">{c.subject}</p>{unreadIds.has(c.id) && <div className="h-2 w-2 rounded-full bg-[var(--aw-magenta)] shadow-sm" />}</div>
                     <p className="text-[10px] font-bold text-[var(--aw-muted)] truncate">{c.participantEmails.join(', ')}</p>
                  </div>
               </button>
             ))}
          </div>
        </aside>

        <main className={["aw-panel flex flex-col min-h-0", !selectedConversation ? "hidden lg:flex" : "flex"].join(" ")}>
          {selectedConversation ? (
            <>
              <header className="p-5 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] flex items-center gap-4">
                 <button onClick={() => setSelectedConversation(null)} className="lg:hidden p-2 bg-white rounded-xl border border-[var(--aw-border-soft)]"><ArrowLeft size={18}/></button>
                 <div className="min-w-0">
                    <h2 className="font-black text-base truncate">{selectedConversation.subject}</h2>
                    <p className="text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">{selectedConversation.participantEmails.join(', ')}</p>
                 </div>
              </header>
              <div className="flex-1 overflow-y-auto aw-seamless-scroll p-6 space-y-6 bg-[var(--aw-bg)]/30">
                 {loadingMessages ? <div className="p-20 text-center font-bold text-[var(--aw-muted)]">Loading transcript...</div> : messages.map(m => {
                   const mine = m.senderEmail === user?.email;
                   return (
                     <div key={m.id} className={["flex flex-col", mine ? "items-end" : "items-start"].join(" ")}>
                        <div className={["max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed", mine ? "bg-[var(--aw-primary)] text-white" : "bg-white border border-[var(--aw-border-soft)] text-[var(--aw-text)]"].join(" ")}>
                           {!mine && <p className="text-[10px] font-black uppercase opacity-60 mb-2">{m.senderEmail.split('@')[0]}</p>}
                           <p className="font-medium whitespace-pre-wrap">{m.body}</p>
                           {m.attachments?.map(a => (
                             <a key={a.id} href={attachmentUrl(a.id)} target="_blank" className="flex items-center gap-3 p-2 mt-3 rounded-lg bg-black/10 border border-white/10 hover:bg-black/20 transition-colors">
                                <FileText size={16}/> <span className="text-xs font-bold truncate">{attachmentName(a)}</span>
                             </a>
                           ))}
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--aw-muted)] mt-2">{formatTime(m.createdAt)}</p>
                     </div>
                   );
                 })}
                 <div ref={endRef} />
              </div>
              <form onSubmit={sendMessage} className="p-4 bg-[var(--aw-surface)] border-t border-[var(--aw-border-soft)]">
                 <div className="flex flex-col gap-3">
                    <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }} className="aw-input !min-h-[80px] !py-3 w-full !bg-[var(--aw-bg)]" placeholder="Type your message..." />
                    <div className="flex justify-between items-center">
                       <label className="aw-btn aw-btn-outline !min-h-[36px] cursor-pointer"><Paperclip size={14}/><span>{files.length || 'Attach'}</span><input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
                       <button type="submit" disabled={isSending || (!reply.trim() && !files.length)} className="aw-btn aw-btn-primary !min-h-[36px] px-6 shadow-lg"><Send size={14}/>{isSending ? 'Sending...' : 'Send Message'}</button>
                    </div>
                 </div>
              </form>
            </>
          ) : <div className="flex-1 flex flex-col items-center justify-center text-[var(--aw-muted)] gap-4"><MessageSquare size={64} strokeWidth={1}/><p className="font-black text-lg uppercase tracking-widest">Select a Conversation</p></div>}
        </main>

        <aside className={["aw-panel flex flex-col min-h-0", !showComposer && conversations.length > 0 ? "hidden lg:flex opacity-40 pointer-events-none" : "flex"].join(" ")}>
           <header className="p-5 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] flex justify-between items-center">
              <h2 className="font-black text-sm uppercase tracking-widest">New Chat</h2>
              {conversations.length > 0 && <button onClick={() => setShowComposer(false)} className="p-1 hover:bg-[var(--aw-bg)] rounded-lg"><X size={16}/></button>}
           </header>
           <form onSubmit={startConversation} className="p-6 space-y-6">
              <div className="aw-form-field"><label className="aw-form-label">To (Email Address)</label><div className="aw-search-wrap !bg-[var(--aw-bg)]"><Mail size={14}/><input required type="email" className="aw-search-input" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder={recipientPlaceholder} /></div></div>
              <div className="aw-form-field"><label className="aw-form-label">Subject</label><input className="aw-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Conversation topic..." /></div>
              <div className="aw-form-field"><label className="aw-form-label">Message</label><textarea required className="aw-input !min-h-[140px] !py-3" value={firstMessage} onChange={e => setFirstMessage(e.target.value)} placeholder="Write your first message..." /></div>
              <button type="submit" disabled={isStarting} className="aw-btn aw-btn-primary w-full shadow-lg"><Send size={16}/>{isStarting ? 'Starting...' : 'Send Invite'}</button>
           </form>
        </aside>
      </div>
    </div>
  );
}
