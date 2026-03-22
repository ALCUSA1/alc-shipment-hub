import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What should I do next?",
  "Are there any risks?",
  "Summarize this shipment",
  "Explain the current status",
];

interface Props {
  shipmentContext: Record<string, any>;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shipment-assistant`;

export function AiShipmentAssistant({ shipmentContext }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages,
        shipment_context: shipmentContext,
      }),
    });

    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({ error: "Stream failed" }));
      throw new Error(err.error || "Failed to connect");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) upsert(content);
        } catch { /* ignore */ }
      }
    }
  };

  const send = async (input: string) => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setDraft("");
    setIsLoading(true);

    try {
      await streamChat(updatedMessages);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${e.message || "Something went wrong. Please try again."}` }]);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  };

  return (
    <Card className="overflow-hidden border-accent/20">
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-accent-foreground" />
            </div>
            <span>AI Shipment Assistant</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <ScrollArea className="h-[320px] pr-3">
                {messages.length === 0 ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                      <Bot className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Ask me anything about this shipment</p>
                      <p className="text-xs text-muted-foreground mt-1">I have full context of all shipment data</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="text-xs px-3 py-1.5 rounded-full border border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user"
                            ? "bg-accent text-accent-foreground"
                            : "bg-muted text-foreground"
                        }`}>
                          <p className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="flex items-end gap-2 mt-3 pt-3 border-t border-border">
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this shipment…"
                  className="min-h-[36px] max-h-[80px] resize-none text-xs"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-accent hover:bg-accent/90"
                  disabled={!draft.trim() || isLoading}
                  onClick={() => send(draft)}
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
