"use client";

import { SidebarTrigger } from "@multica/ui/components/ui/sidebar";
import { ChatInput } from "@multica/ui/components/chat-input";
import { MemoizedMarkdown } from "@multica/ui/components/markdown";
import { useDeviceStore } from "@multica/store";
import { useMessages } from "../hooks/use-messages";
import { cn } from "@multica/ui/lib/utils";

export function Chat() {
  const deviceId = useDeviceStore((s) => s.deviceId);
  const messages = useMessages();

  return (
    <div className="h-dvh flex flex-col overflow-hidden w-full">
      <header className="flex items-center gap-2 p-2">
        <SidebarTrigger />
        <span className="text-xs text-muted-foreground font-mono" suppressHydrationWarning>
          {deviceId.slice(0, 8)}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-muted"
                    : ""
                )}
              >
                <MemoizedMarkdown mode="minimal" id={msg.id}>
                  {msg.content}
                </MemoizedMarkdown>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="w-full px-4 max-w-4xl mx-auto">
        <ChatInput />
      </footer>
    </div>
  );
}
