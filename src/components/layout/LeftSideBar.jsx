import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ChatMessages from "./ChatMessages";
import ChatInput from "../ChatInput";

function LeftSideBar({ messages, onSend }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hideContent, setHideContent] = useState(false);

  const toggleSidebar = () => {
    if (collapsed) {
      setHideContent(false);
      requestAnimationFrame(() => {
        setCollapsed(false);
      });
    } else {
      setCollapsed(true);
    }
  };

  const handleTransitionEnd = (e) => {
    if (e.propertyName !== "width" && e.propertyName !== "height") return;
    if (collapsed) {
      setHideContent(true);
    }
  };

  return (
    <div
      onTransitionEnd={handleTransitionEnd}
      className={`
        relative
        bg-gray-100
        border-b md:border-b-0 md:border-r border-gray-200
        flex flex-col
        p-2
        overflow-hidden
        transition-[width,height] duration-300 ease-in-out
        ${collapsed ? "h-12 md:h-full md:w-12" : "h-1/2 md:h-full w-full md:w-80"}
      `}
    >
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="
          shrink-0
          self-end md:self-start
          size-8
          flex items-center justify-center
          rounded-full
          text-gray-600
          hover:bg-gray-200
          transition-colors
        "
        aria-label={collapsed ? "Expand chat" : "Collapse chat"}
        title={collapsed ? "Expand chat" : "Collapse chat"}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </button>

      <div
        className={`${hideContent ? "hidden" : ""}flex flex-col flex-1 min-h-0 pt-2 w-full `}
      >
        <ChatMessages messages={messages} />
        <div className="pt-2">
          <ChatInput onSend={onSend} />
        </div>
      </div>
    </div>
  );
}

export default LeftSideBar;