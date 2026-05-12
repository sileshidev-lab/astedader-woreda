import { ChatWorkspace } from "../../shared/chat/ChatWorkspace";

export function ChatPage() {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <ChatWorkspace
        contextLabel="Woreda"
        recipientPlaceholder="hibret@woreda.local"
      />
    </section>
  );
}
