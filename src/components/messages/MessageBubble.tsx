import { format } from "date-fns";
import { Paperclip } from "lucide-react";

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface MessageBubbleProps {
  content: string | null;
  senderName: string | null;
  createdAt: string;
  isOwn: boolean;
  attachments?: Attachment[];
}

export function MessageBubble({ content, senderName, createdAt, isOwn, attachments = [] }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[70%] ${isOwn ? "order-1" : ""}`}>
        {!isOwn && (
          <p className="text-[11px] text-muted-foreground mb-0.5 px-1">{senderName}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isOwn
              ? "bg-accent text-accent-foreground rounded-br-md"
              : "bg-secondary text-secondary-foreground rounded-bl-md"
          }`}
        >
          {content && <p className="whitespace-pre-wrap break-words">{content}</p>}
          {attachments.length > 0 && (
            <div className="mt-1.5 space-y-1">
              {attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1.5 text-xs underline ${
                    isOwn ? "text-accent-foreground/80" : "text-accent"
                  }`}
                >
                  <Paperclip className="h-3 w-3" />
                  {att.name}
                </a>
              ))}
            </div>
          )}
        </div>
        <p className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? "text-right" : ""}`}>
          {format(new Date(createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}
