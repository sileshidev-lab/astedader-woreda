import { ChatWorkspace } from "../../shared/chat/ChatWorkspace";

export function MemberChatPage() {
  return (
    <section className="aw-design-page aw-mobile-page aw-chat-page flex min-h-0 flex-1 flex-col">
      <ChatWorkspace
        contextLabel="Member"
        recipientPlaceholder="admin@woreda.local"
      />
    </section>
  );
}
