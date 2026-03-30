import { TextField, Button } from "@mui/material";
import { useState } from "react";
import { useChatStyles } from "./Chat.Style";

type Message = {
  role: "user" | "ai";
  text: string;
};

export default function Chat() {
  const classes = useChatStyles();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [, setIsTyping] = useState(false);

  const fakeAIResponse =
    "Case Strength: Medium. Based on your description, this appears to be a potential employment dispute. Suggested next steps: collect payment proof and consider sending a legal notice.";

  const typeAIMessage = (fullText: string) => {
    let index = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      index++;

      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];

        if (lastMsg?.role === "ai") {
          lastMsg.text = fullText.slice(0, index);
        }

        return [...updated];
      });

      if (index === fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 20); // speed of typing
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: "user", text: input };
    const aiMsg: Message = { role: "ai", text: "" };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");

    // Start typing animation
    setTimeout(() => {
      typeAIMessage(fakeAIResponse);
    }, 500);
  };

  return (
    <div className={classes.root}>
      {/* LEFT SIDEBAR */}
      <div className={classes.sidebar}>
        <div className={classes.logo}>LegalGPT</div>
        <div className={classes.menuItem}>+ New Chat</div>
        <div className={classes.menuItem}>Employment</div>
        <div className={classes.menuItem}>Property</div>
        <div className={classes.menuItem}>FIR Help</div>
      </div>

      {/* CHAT AREA */}
      <div className={classes.chatArea}>
        <div className={classes.messages}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className={classes.userMsg}>{msg.text}</div>
              ) : (
                <div className={classes.aiMsg}>
                  {msg.text || "AI is typing..."}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={classes.inputBar}>
          <TextField
            fullWidth
            placeholder="Describe your legal problem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button variant="contained" onClick={sendMessage}>
            Send
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={classes.historyPanel}>
        <div className={classes.historyTitle}>Chats</div>
        <div className={classes.historyItem}>Salary Case</div>
        <div className={classes.historyItem}>Property Dispute</div>
      </div>
    </div>
  );
}