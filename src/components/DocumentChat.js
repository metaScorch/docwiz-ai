import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocumentChat({ documentId, documentContent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          documentContent,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const ChatMessage = ({ message }) => (
    <div
      className={cn(
        "flex gap-3 p-4",
        message.role === "assistant" ? "bg-muted/50" : "bg-background",
        message.error && "bg-destructive/10"
      )}
    >
      {message.role === "assistant" ? (
        <Bot className="h-6 w-6 flex-shrink-0" />
      ) : (
        <User className="h-6 w-6 flex-shrink-0" />
      )}
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm dark:prose-invert">
          {message.content}
        </div>
        {message.role === "assistant" && !message.error && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Wand2 className="h-3 w-3 mr-1" />
            Apply Suggestion
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Document Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask questions or request analysis about your document
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col divide-y">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {messages.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No messages yet. Start by asking a question about your document.
            </div>
          )}
          {/* Invisible element for scrolling */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
