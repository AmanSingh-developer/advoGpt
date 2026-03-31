import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Fade,
  Grow,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  Person as PersonIcon,
  Send as SendIcon,
  Lightbulb as LightbulbIcon,
  Scale as ScaleIcon,
  Description as DescriptionIcon,
  Balance as BalanceIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { toast } from "react-toastify";

const CREATE_CHAT_SESSION = gql`
  mutation CreateChatSession($title: String!, $caseType: String) {
    createChatSession(input: { title: $title, caseType: $caseType }) {
      id
      title
      caseType
      createdAt
      updatedAt
      messages {
        id
        role
        content
        msgMetadata
        createdAt
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: String!, $message: String!) {
    sendMessage(input: { sessionId: $sessionId, message: $message }) {
      id
      role
      content
      msgMetadata
      createdAt
    }
  }
`;

interface CreateChatSessionResponse {
  createChatSession: {
    id: string;
    title: string;
    caseType: string | null;
    createdAt: string;
    updatedAt: string;
    messages: ChatMessage[];
  };
}

interface SendMessageResponse {
  sendMessage: ChatMessage;
}

interface ChatSession {
  id: string;
  title: string;
  caseType: string | null;
  createdAt: string;
  updatedAt: string | null;
  messages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  msgMetadata: string | null;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  analysis?: {
    category: string;
    strength: string;
    reason: string;
    legalAreas: string[];
    nextSteps: string[];
  };
  timestamp: Date;
}

const strengthConfig = {
  STRONG: { color: "#10b981", bg: "#d1fae5", border: "#10b981", label: "Strong" },
  MEDIUM: { color: "#f59e0b", bg: "#fef3c7", border: "#f59e0b", label: "Medium" },
  WEAK: { color: "#ef4444", bg: "#fee2e2", border: "#ef4444", label: "Weak" },
};

const quickPrompts = [
  { icon: <LightbulbIcon />, text: "Workplace harassment case advice" },
  { icon: <ScaleIcon />, text: "Cheque bounce notice response" },
  { icon: <DescriptionIcon />, text: "Property dispute consultation" },
  { icon: <BalanceIcon />, text: "Consumer complaint filing" },
];

interface ChatAreaProps {
  currentSession: ChatSession | null;
  onSessionChange: (session: ChatSession) => void;
  onRefetchSessions: () => void;
}

export default function ChatArea({ currentSession, onSessionChange, onRefetchSessions }: ChatAreaProps) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [createChatSession] = useMutation<CreateChatSessionResponse>(CREATE_CHAT_SESSION);
  const [sendMessageMutation, { loading }] = useMutation<SendMessageResponse>(SEND_MESSAGE);

  const parseAnalysisFromContent = (content: string) => {
    const categoryMatch = content.match(/\*\*Case Category:\*\* ([\s\S]*?)\n/);
    const category = categoryMatch?.[1]?.trim() ?? "General";

    const strengthMatch = content.match(/\*\*Case Strength:\*\* (\w+)/);
    const strength = strengthMatch?.[1] ?? "MEDIUM";

    const reasonMatch = content.match(/\*\*Analysis:\*\*([\s\S]*?)\*\*Relevant Legal Areas:\*\*/);
    const reason = reasonMatch?.[1]?.trim() ?? "";

    const areasMatch = content.match(/\*\*Relevant Legal Areas:\*\*([\s\S]*?)\*\*Suggested Next Steps:\*\*/);
    const legalAreas = areasMatch?.[1]
      ? areasMatch[1].split(",").map((a: string) => a.trim()).filter(Boolean)
      : [];

    const stepsMatch = content.match(/\*\*Suggested Next Steps:\*\*([\s\S]*?)$/);
    const nextSteps = stepsMatch?.[1]
      ? stepsMatch[1]
          .split("\n")
          .map((s: string) => s.replace(/^\d+\.\s*/, "").trim())
          .filter(Boolean)
      : [];

    return { category, strength, reason, legalAreas, nextSteps };
  };

  const sessionMessages = useMemo(() => {
    if (!currentSession?.messages) return [];
    return currentSession.messages.map((msg: ChatMessage) => {
      const analysis = msg.msgMetadata?.startsWith("strength:") ? parseAnalysisFromContent(msg.content) : undefined;
      return {
        id: msg.id,
        role: msg.role === "assistant" ? "assistant" : "user",
        text: analysis ? "" : msg.content,
        analysis,
        timestamp: new Date(msg.createdAt),
      };
    });
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, currentSession]);

  const messages = useMemo(() => {
    const sessionMsgs = sessionMessages;
    const localMsgs = localMessages;
    if (localMsgs.length > 0) {
      return [...sessionMsgs, ...localMsgs];
    }
    return sessionMsgs;
  }, [sessionMessages, localMessages]);

  const handleCreateChat = async () => {
    try {
      const { data } = await createChatSession({
        variables: {
          title: `Chat - ${new Date().toLocaleDateString()}`,
          caseType: null,
        },
      });

      if (data?.createChatSession) {
        onSessionChange(data.createChatSession);
        onRefetchSessions();
        setLocalMessages([]);
        return data.createChatSession;
      }
    } catch (err) {
      toast.error("Failed to create chat. Please try again.");
    }
    return null;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    let session = currentSession;
    if (!session) {
      session = await handleCreateChat();
      if (!session) return;
    }

    setError("");
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      text: input,
      timestamp: new Date(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const { data } = await sendMessageMutation({
        variables: {
          sessionId: session!.id,
          message: input,
        },
      });

      if (data?.sendMessage) {
        const analysis = parseAnalysisFromContent(data.sendMessage.content);
        const aiMsg: Message = {
          id: data.sendMessage.id,
          role: "assistant",
          text: analysis ? "" : data.sendMessage.content,
          analysis: analysis.reason ? analysis : undefined,
          timestamp: new Date(data.sendMessage.createdAt),
        };
        setLocalMessages((prev) => [...prev, aiMsg]);
      }
      onRefetchSessions();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze case. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickPrompt = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const getStrengthConfigFn = (strength: string) => {
    return strengthConfig[strength as keyof typeof strengthConfig] || { color: "#6b7280", bg: "#f3f4f6", border: "#6b7280", label: strength };
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "#343541", height: "100%", overflow: "hidden" }}>
      {/* Chat Messages Area */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, scrollBehavior: "smooth" }}>
        {messages.length === 0 ? (
            <Box sx={{ maxWidth: 700, mx: "auto", width: "100%", mt: 6 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Avatar sx={{ width: 56, height: 56, mx: "auto", mb: 2, bgcolor: "#10b981", fontSize: 28 }}>
                <GavelIcon sx={{ fontSize: 28 }} />
              </Avatar>
              <Typography variant="h5" sx={{ color: "#fff", fontWeight: 600, mb: 0.75 }}>
                How can I help you today?
              </Typography>
              <Typography variant="body2" sx={{ color: "#a1a1aa" }}>
                Describe your legal situation and I'll analyze it under Indian law
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              {quickPrompts.map((prompt, idx) => (
                <Box
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt.text)}
                  sx={{
                    p: 2,
                    bgcolor: "#3d3d4f",
                    borderRadius: 2,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": { bgcolor: "#4a4a5c", transform: "translateY(-1px)" },
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ color: "#10b981" }}>{prompt.icon}</Box>
                  <Typography sx={{ color: "#fff", fontSize: "0.8rem" }}>{prompt.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
          ) : (
          <Box sx={{ maxWidth: 900, mx: "auto", width: "100%" }}>
            {messages.map((msg) => (
              <Grow in key={msg.id} timeout={300}>
                <Box 
                  sx={{ 
                    display: "flex", 
                    gap: 2, 
                    mb: 2, 
                    px: 2,
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: msg.role === "assistant" ? "#10b981" : "#3b82f6",
                      width: 32,
                      height: 32,
                      fontSize: 16,
                    }}
                  >
                    {msg.role === "assistant" ? <GavelIcon sx={{ fontSize: 18 }} /> : <PersonIcon sx={{ fontSize: 18 }} />}
                  </Avatar>
                  <Box sx={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {msg.analysis ? (
                      <Box
                        sx={{
                          bgcolor: "#40414f",
                          borderRadius: 2,
                          p: 2.5,
                          color: "#fff",
                          width: "100%",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#10b981", mb: 1 }}>
                          Case Strength: {msg.analysis.strength}
                        </Typography>
                        
                        <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.6, color: "#e5e5e5", whiteSpace: "pre-wrap", mb: 1.5 }}>
                          {msg.analysis.reason}
                        </Typography>

                        {msg.analysis.legalAreas.length > 0 && (
                          <Typography sx={{ fontSize: "0.8rem", color: "#a1a1aa", mb: 1 }}>
                            Legal Areas: {msg.analysis.legalAreas.join(", ")}
                          </Typography>
                        )}

                        {msg.analysis.nextSteps.length > 0 && (
                          <Box>
                            <Typography sx={{ fontSize: "0.8rem", color: "#a1a1aa", mb: 0.5 }}>
                              Suggested Steps:
                            </Typography>
                            <Box component="ul" sx={{ m: 0, pl: 2, pb: 0 }}>
                              {msg.analysis.nextSteps.slice(0, 4).map((step: string, idx: number) => (
                                <li key={idx} style={{ marginBottom: 2, color: "#e5e5e5", fontSize: "0.85rem" }}>
                                  {step}
                                </li>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          bgcolor: msg.role === "user" ? "#3b82f6" : "#40414f",
                          color: "#fff",
                          maxWidth: "100%",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </Typography>
                        <Typography sx={{ fontSize: "0.65rem", color: "#9ca3af", mt: 0.5, textAlign: msg.role === "user" ? "right" : "left" }}>
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grow>
            ))}

            {loading && (
              <Fade in>
                <Box sx={{ display: "flex", gap: 1.5, px: 2 }}>
                  <Avatar sx={{ bgcolor: "#10b981", width: 32, height: 32, fontSize: 14 }}>
                    <GavelIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                  <Box sx={{ bgcolor: "#40414f", borderRadius: 2, px: 2, py: 1.5 }}>
                    <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                      <Box sx={{ width: 6, height: 6, bgcolor: "#10b981", borderRadius: "50%", animation: "pulse 1s infinite" }} />
                      <Box sx={{ width: 6, height: 6, bgcolor: "#10b981", borderRadius: "50%", animation: "pulse 1s infinite 0.2s" }} />
                      <Box sx={{ width: 6, height: 6, bgcolor: "#10b981", borderRadius: "50%", animation: "pulse 1s infinite 0.4s" }} />
                    </Box>
                  </Box>
                </Box>
              </Fade>
            )}
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Input Area */}
      <Box sx={{ px: 2, py: 1.5, borderTop: "1px solid #40414f" }}>
        <Box
          sx={{
            maxWidth: 900,
            mx: "auto",
            display: "flex",
            gap: 1.5,
            alignItems: "flex-end",
          }}
        >
          <TextField
            fullWidth
            placeholder="Message LegalGPT..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            multiline
            maxRows={4}
            variant="outlined"
            autoFocus
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#40414f",
                borderRadius: 2,
                color: "#fff",
                "& fieldset": { borderColor: "#52525b" },
                "&:hover fieldset": { borderColor: "#6b7280" },
                "&.Mui-focused fieldset": { borderColor: "#10b981" },
              },
              "& .MuiInputBase-input::placeholder": { color: "#9ca3af", opacity: 1 },
            }}
            inputRef={inputRef}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            sx={{
              bgcolor: "#10b981",
              minWidth: 42,
              height: 42,
              borderRadius: 2,
              "&:hover": { bgcolor: "#059669" },
              "&:disabled": { bgcolor: "#40414f", color: "#6b7280" },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          </Button>
        </Box>
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </Box>
  );
}
