import { useState } from "react";
import { Send } from "lucide-react";
import TextBox from "./TextBox";

function ChatInput({ onSend }) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  // Listening on the wrapper div, not on TextBox itself — keydown bubbles up
  // from whatever input TextBox renders internally, so this works regardless
  // of whether TextBox forwards an onKeyDown prop.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2" onKeyDown={handleKeyDown}>
      <TextBox
        className="flex-1 resize-none min-w-0"
        value={value}
        onChange={setValue}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!value.trim()}
        className="
          size-12
          shrink-0
          rounded-full
          p-0
          border-0
          bg-blue-600
          text-white
          flex
          items-center
          justify-center
          hover:bg-blue-700
          disabled:opacity-40
          disabled:cursor-not-allowed
          shadow-md
          mb-auto
          mt-auto
        "
      >
        <Send className="size-5" />
      </button>
    </div>
  );
}

export default ChatInput;