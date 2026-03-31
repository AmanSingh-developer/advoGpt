import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Chip,
  Fade,
  Grow,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  Person as PersonIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

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
  STRONG: { color: "#4CAF50", bg: "#E8F5E9", label: "Strong" },
  MEDIUM: { color: "#FF9800", bg: "#FFF3E0", label: "Medium" },
  WEAK: { color: "#F44336", bg: "#FFEBEE", label: "Weak" },
};

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

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

  const messages = currentSession ? sessionMessages : localMessages;

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
        return data.createChatSession;
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStrengthConfigFn = (strength: string) => {
    return strengthConfig[strength as keyof typeof strengthConfig] || { color: "#9E9E9E", bg: "#F5F5F5", label: strength };
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Top Bar */}
      <Box
        sx={{
          bgcolor: "#1a237e",
          color: "white",
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton size="small" onClick={() => navigate("/select-case")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {currentSession?.title || "LegalGPT Assistant"}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {currentSession?.caseType || "Describe your case"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Chat Messages */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && (
          <Fade in timeout={500}>
            <Paper elevation={0} sx={{ p: 4, textAlign: "center", bgcolor: "transparent", maxWidth: 600, mx: "auto", mt: 4 }}>
              <Avatar sx={{ width: 80, height: 80, mx: "auto", mb: 3, bgcolor: "#3949ab", fontSize: 40 }}>
                <GavelIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: "#1a237e" }}>
                Welcome to LegalGPT
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your AI-powered legal assistant for Indian law analysis
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, flexWrap: "wrap" }}>
                <Chip label="Indian Laws" color="primary" size="small" />
                <Chip label="Case Analysis" color="primary" size="small" />
                <Chip label="Legal Guidance" color="primary" size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 4, fontStyle: "italic" }}>
                {currentSession ? "Describe your legal situation below..." : "Start a new chat to get started..."}
              </Typography>
            </Paper>
          </Fade>
        )}

        {loading && (
          <Fade in>
            <Paper sx={{ p: 2, mb: 2, maxWidth: 600, display: "flex", alignItems: "center", gap: 2, bgcolor: "white" }}>
              <Avatar sx={{ bgcolor: "#3949ab" }}><GavelIcon /></Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>Analyzing your case...</Typography>
              </Box>
            </Paper>
          </Fade>
        )}

        {messages.map((msg) => (
          <Grow in key={msg.id} timeout={300}>
            <Box sx={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", mb: 2 }}>
              {msg.role === "assistant" && (
                <Avatar sx={{ bgcolor: "#3949ab", mr: 1.5, mt: 0.5 }}><GavelIcon sx={{ fontSize: 20 }} /></Avatar>
              )}

              <Box sx={{ maxWidth: "70%" }}>
                {msg.role === "user" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, justifyContent: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <Avatar sx={{ bgcolor: "#1e88e5", width: 24, height: 24 }}><PersonIcon sx={{ fontSize: 14 }} /></Avatar>
                  </Box>
                )}

                {msg.analysis ? (
                  <Paper elevation={2} sx={{ p: 3, borderRadius: 3, bgcolor: "white" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <GavelIcon sx={{ color: "#3949ab" }} />
                      <Typography variant="h6" fontWeight={600} sx={{ color: "#1a237e" }}>Case Analysis Report</Typography>
                    </Box>

                    {msg.analysis.category && (
                      <Box sx={{ mb: 2 }}>
                        <Chip label={`Category: ${msg.analysis.category}`} sx={{ bgcolor: "#3949ab", color: "white", fontWeight: 600 }} />
                      </Box>
                    )}

                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: getStrengthConfigFn(msg.analysis.strength).bg, border: `2px solid ${getStrengthConfigFn(msg.analysis.strength).color}`, mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: "#666", mb: 0.5 }}>Case Strength</Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: getStrengthConfigFn(msg.analysis.strength).color }}>
                        {getStrengthConfigFn(msg.analysis.strength).label}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Analysis</Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: "#444" }}>{msg.analysis.reason}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Relevant Legal Areas</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {msg.analysis.legalAreas.map((area: string, idx: number) => (
                          <Chip key={idx} label={area} size="small" sx={{ bgcolor: "#E8EAF6", color: "#3949ab", fontWeight: 500 }} />
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Suggested Next Steps</Typography>
                      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {msg.analysis.nextSteps.map((step: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{step}</Typography></li>
                        ))}
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed #ddd" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                        This analysis is for guidance only. Please consult a licensed advocate for definitive legal advice.
                      </Typography>
                    </Box>
                  </Paper>
                ) : (
                  <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: msg.role === "user" ? "#1e88e5" : "#333", color: "white" }}>
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                )}
              </Box>

              {msg.role === "user" && <Avatar sx={{ bgcolor: "#1e88e5", ml: 1.5, mt: 0.5 }}><PersonIcon /></Avatar>}
            </Box>
          </Grow>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Input Area */}
      <Paper elevation={8} sx={{ p: 2, mx: 2, mb: 2, borderRadius: 4, display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          fullWidth
          placeholder="Describe your legal situation..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          multiline
          maxRows={4}
          variant="outlined"
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          inputRef={inputRef}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          sx={{ bgcolor: "#1a237e", minWidth: "auto", px: 2 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </Button>
      </Paper>
    </Box>
  );
}
