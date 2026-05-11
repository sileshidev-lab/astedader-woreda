import { ChatWorkspace } from "../../shared/chat/ChatWorkspace";

export function ChatPage() {
  return (
    <section className="aw-design-page aw-mobile-page aw-chat-page flex min-h-0 flex-1 flex-col">
      <ChatWorkspace
        contextLabel="Woreda"
        recipientPlaceholder="hibret@woreda.local"
      />
    </section>
  );
}
