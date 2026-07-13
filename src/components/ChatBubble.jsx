function ChatBubble({ role, text }) {
  const isUser = role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[85%] sm:max-w-[75%]
          rounded-2xl
          px-3 py-2
          text-sm
          wrap-break-words
          whitespace-pre-wrap
          shadow-sm
          ${isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"}
        `}
      >
        {text}
      </div>
    </div>
  );
}

export default ChatBubble;