"use client";
import { useRef } from "react";
import { Button } from "@multica/ui/components/ui/button";
import { ArrowUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const value = textareaRef.current?.value ?? "";
    if (!value.trim()) return;
    console.log("submit:", value);
    textareaRef.current!.value = "";
    // reset height
    textareaRef.current!.style.height = "auto";
  };

  return (
    <div className="bg-card rounded-xl p-3 pt-1 border border-border">
      <textarea
        ref={textareaRef}
        rows={2}
        placeholder="Type a message..."
        onChange={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        className="w-full resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-end pt-2">
        <Button size="icon-sm" onClick={handleSubmit}>
          <HugeiconsIcon icon={ArrowUpIcon} />
        </Button>
      </div>
    </div>
  );
}
