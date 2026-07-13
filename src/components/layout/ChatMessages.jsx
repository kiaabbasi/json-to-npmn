import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import ChatBubble from "../ChatBubble";

const NEAR_BOTTOM_THRESHOLD = 80; // px

function ChatMessages({ messages }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(messages.length);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD;
  };

  const scrollToBottom = (behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll only when a new message arrives AND user is already near bottom
  useEffect(() => {
    const isNewMessage = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (isNewMessage && isNearBottom()) {
      scrollToBottom();
    }
  }, [messages]);

  const handleScroll = () => {
    
    
    setShowScrollButton(!isNearBottom());
  };

  useEffect(handleScroll,[])
  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-x-hidden overflow-y-auto flex flex-col gap-2 pr-1"
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} text={msg.text} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom button */}
      <button
        type="button"
        onClick={() => scrollToBottom()}
        className={`
          absolute bottom-2 left-1/2 -translate-x-1/2
          size-9
          flex items-center justify-center
          rounded-full
          bg-gray-200 text-gray-800
          shadow-md
          transition-all duration-300 ease-in-out
          hover:cursor-pointer
          hover:bg-gray-300
          ${showScrollButton
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"}
        `}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}

export default ChatMessages;