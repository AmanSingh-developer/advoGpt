import {
  TextField,
  Typography,
  Box,
  Chip,
  Avatar,
  Fab,
  Paper,
  LinearProgress,
  Fade,
  Grow,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemButton,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useChatStyles } from "./Chat.Style";
import { gql } from "@apollo/client";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { CircularProgress, Alert } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import SendIcon from "@mui/icons-material/Send";
import GavelIcon from "@mui/icons-material/Gavel";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import FolderIcon from "@mui/icons-material/Folder";
import AssessmentIcon from "@mui/icons-material/Assessment";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const GET_CHAT_SESSIONS = gql`
  query GetChatSessions {
    getChatSessions {
      id
      title
      caseType
      createdAt
      updatedAt
      messageCount
    }
  }
`;

const GET_CHAT_SESSION = gql`
  query GetChatSession($sessionId: String!) {
    getChatSession(sessionId: $sessionId) {
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

const DELETE_CHAT_SESSION = gql`
  mutation DeleteChatSession($sessionId: String!) {
    deleteChatSession(sessionId: $sessionId) {
      success
      message
    }
  }
`;

interface ChatSession {
  id: string;
  title: string;
  caseType: string | null;
  createdAt: string;
  updatedAt: string | null;
  messageCount?: number;
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

type FeatureTab = "chat" | "documents" | "fir" | "notice";

const features = [
  { id: "chat" as FeatureTab, label: "Case Analysis", icon: <GavelIcon /> },
  { id: "fir" as FeatureTab, label: "FIR Analysis", icon: <DescriptionIcon /> },
  { id: "documents" as FeatureTab, label: "Documents", icon: <FolderIcon /> },
  { id: "notice" as FeatureTab, label: "Legal Notice", icon: <AssessmentIcon /> },
];

export default function Chat() {
  useChatStyles();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [caseType, setCaseType] = useState<string>("");
  const [error, setError] = useState("");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState("");
  const [activeFeature, setActiveFeature] = useState<FeatureTab>("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: sessionsData, refetch: refetchSessions } = useQuery(GET_CHAT_SESSIONS, {
    skip: !token,
  });

  const [getChatSession] = useLazyQuery(GET_CHAT_SESSION);
  const [createChatSession, { loading: creatingSession }] = useMutation(CREATE_CHAT_SESSION);
  const [sendMessageMutation, { loading }] = useMutation(SEND_MESSAGE);
  const [deleteChatSession] = useMutation(DELETE_CHAT_SESSION);

  useEffect(() => {
    const storedCaseType = localStorage.getItem("caseType");
    if (storedCaseType) {
      setCaseType(storedCaseType);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const loadSession = async (session: ChatSession) => {
    try {
      const { data } = await getChatSession({ variables: { sessionId: session.id } });
      if (data?.getChatSession) {
        setCurrentSession(data.getChatSession);
        const loadedMessages: Message[] = data.getChatSession.messages.map((msg: ChatMessage) => {
          const analysis = msg.msgMetadata?.startsWith("strength:") ? parseAnalysisFromContent(msg.content) : undefined;
          return {
            id: msg.id,
            role: msg.role === "assistant" ? "assistant" : "user",
            text: analysis ? "" : msg.content,
            analysis,
            timestamp: new Date(msg.createdAt),
          };
        });
        setMessages(loadedMessages);
        if (data.getChatSession.caseType) {
          setCaseType(data.getChatSession.caseType);
        }
      }
    } catch (err) {
      console.error("Failed to load chat session:", err);
    }
  };

  const parseAnalysisFromContent = (content: string) => {
    const categoryMatch = content.match(/\*\*Case Category:\*\* ([\s\S]*?)\n/);
    const category = categoryMatch ? categoryMatch[1].trim() : "General";

    const strengthMatch = content.match(/\*\*Case Strength:\*\* (\w+)/);
    const strength = strengthMatch ? strengthMatch[1] : "MEDIUM";

    const reasonMatch = content.match(/\*\*Analysis:\*\*([\s\S]*?)\*\*Relevant Legal Areas:\*\*/);
    const reason = reasonMatch ? reasonMatch[1].trim() : "";

    const areasMatch = content.match(/\*\*Relevant Legal Areas:\*\*([\s\S]*?)\*\*Suggested Next Steps:\*\*/);
    const legalAreas = areasMatch
      ? areasMatch[1].split(",").map((a: string) => a.trim()).filter(Boolean)
      : [];

    const stepsMatch = content.match(/\*\*Suggested Next Steps:\*\*([\s\S]*?)$/);
    const nextSteps = stepsMatch
      ? stepsMatch[1]
          .split("\n")
          .map((s: string) => s.replace(/^\d+\.\s*/, "").trim())
          .filter(Boolean)
      : [];

    return { category, strength, reason, legalAreas, nextSteps };
  };

  const handleCreateChat = async () => {
    try {
      const { data } = await createChatSession({
        variables: {
          title: newChatTitle || `Chat - ${new Date().toLocaleDateString()}`,
          caseType: null,
        },
      });

      if (data?.createChatSession) {
        setCurrentSession(data.createChatSession);
        setMessages([]);
      }
      setNewChatDialogOpen(false);
      setNewChatTitle("");
      refetchSessions();
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const handleDeleteChat = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatSession({ variables: { sessionId } });
      refetchSessions();
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    if (!currentSession) {
      await handleCreateChat();
      if (!currentSession) return;
    }

    setError("");
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const { data } = await sendMessageMutation({
        variables: {
          sessionId: currentSession.id,
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
        setMessages((prev) => [...prev, aiMsg]);
      }
      refetchSessions();
    } catch (err: any) {
      setError(err.message || "Failed to analyze case. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStrengthConfig = (strength: string) => {
    return strengthConfig[strength as keyof typeof strengthConfig] || { color: "#9E9E9E", bg: "#F5F5F5", label: strength };
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f0f2f5" }}>
      {/* Left Sidebar - Features */}
      <Box
        sx={{
          width: 250,
          bgcolor: "white",
          borderRight: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo/Header */}
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: "#1a237e", width: 36, height: 36 }}>
              <GavelIcon sx={{ fontSize: 20 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#1a237e", fontSize: "1rem" }}>
                LegalGPT
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Feature Navigation */}
        <List sx={{ flex: 1, py: 1 }}>
          {features.map((feature) => (
            <ListItemButton
              key={feature.id}
              selected={activeFeature === feature.id}
              onClick={() => setActiveFeature(feature.id)}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                py: 0.75,
                "&.Mui-selected": {
                  bgcolor: "#E8EAF6",
                  "&:hover": { bgcolor: "#C5CAE9" },
                },
              }}
            >
              <Box sx={{ mr: 1.5, color: activeFeature === feature.id ? "#1a237e" : "#666" }}>
                {feature.icon}
              </Box>
              <ListItemText
                primary={feature.label}
                primaryTypographyProps={{
                  fontSize: "0.85rem",
                  fontWeight: activeFeature === feature.id ? 600 : 400,
                  color: activeFeature === feature.id ? "#1a237e" : "text.primary",
                }}
              />
            </ListItemButton>
          ))}
        </List>

        {/* User Info & Logout */}
        <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar sx={{ bgcolor: "#1a237e", width: 28, height: 28 }}>
              <PersonIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: "0.8rem" }}>
                {user?.firstName}
              </Typography>
            </Box>
            <IconButton size="small" onClick={handleLogout} color="error">
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Middle - Chat Area */}
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

        {/* Feature Panels */}
        {activeFeature === "fir" && (
          <Box sx={{ flex: 1, p: 3, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <DescriptionIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              FIR Analysis (Coming Soon)
            </Typography>
            <Typography color="text.secondary">
              Upload an FIR document to analyze IPC sections and case details
            </Typography>
          </Box>
        )}

        {activeFeature === "documents" && (
          <Box sx={{ flex: 1, p: 3, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <FolderIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Document Analyzer (Coming Soon)
            </Typography>
            <Typography color="text.secondary">
              Upload contracts, agreements, or legal documents for analysis
            </Typography>
          </Box>
        )}

        {activeFeature === "notice" && (
          <Box sx={{ flex: 1, p: 3, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <AssessmentIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Legal Notice Generator (Coming Soon)
            </Typography>
            <Typography color="text.secondary">
              Generate legal notices for salary recovery, property disputes, etc.
            </Typography>
          </Box>
        )}

        {/* Chat Messages Area */}
        {/* Chat Messages Area */}
        {activeFeature === "chat" && (
          <>
            <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {messages.length === 0 && (
          <Fade in timeout={500}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: "center",
                bgcolor: "transparent",
                maxWidth: 600,
                mx: "auto",
                mt: 4,
              }}
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 3,
                  bgcolor: "#3949ab",
                  fontSize: 40,
                }}
              >
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
            <Paper
              sx={{
                p: 2,
                mb: 2,
                maxWidth: 600,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "white",
              }}
            >
              <Avatar sx={{ bgcolor: "#3949ab" }}>
                <GavelIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Analyzing your case...
                </Typography>
                <LinearProgress sx={{ borderRadius: 1 }} />
              </Box>
            </Paper>
          </Fade>
        )}

        {messages.map((msg) => (
          <Grow in key={msg.id} timeout={300}>
            <Box
              sx={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              {msg.role === "assistant" && (
                <Avatar sx={{ bgcolor: "#3949ab", mr: 1.5, mt: 0.5 }}>
                  <GavelIcon sx={{ fontSize: 20 }} />
                </Avatar>
              )}

              <Box sx={{ maxWidth: "70%" }}>
                {msg.role === "user" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, justifyContent: "flex-end" }}>
                    <Typography variant="caption" color="text.secondary">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                    <Avatar sx={{ bgcolor: "#1e88e5", width: 24, height: 24 }}>
                      <PersonIcon sx={{ fontSize: 14 }} />
                    </Avatar>
                  </Box>
                )}

                {msg.analysis ? (
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: 3,
                      bgcolor: "white",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <GavelIcon sx={{ color: "#3949ab" }} />
                      <Typography variant="h6" fontWeight={600} sx={{ color: "#1a237e" }}>
                        Case Analysis Report
                      </Typography>
                    </Box>

                    {msg.analysis.category && (
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={`Category: ${msg.analysis.category}`}
                          sx={{
                            bgcolor: "#3949ab",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    )}

                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: getStrengthConfig(msg.analysis.strength).bg,
                        border: `2px solid ${getStrengthConfig(msg.analysis.strength).color}`,
                        mb: 2,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ color: "#666", mb: 0.5 }}>
                        Case Strength
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="h4" fontWeight={700} sx={{ color: getStrengthConfig(msg.analysis.strength).color }}>
                          {getStrengthConfig(msg.analysis.strength).label}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <span style={{ color: "#3949ab" }}>📋</span> Analysis
                      </Typography>
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: "#444" }}>
                        {msg.analysis.reason}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <span style={{ color: "#3949ab" }}>⚖️</span> Relevant Legal Areas
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {msg.analysis.legalAreas.map((area: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={area}
                            size="small"
                            sx={{
                              bgcolor: "#E8EAF6",
                              color: "#3949ab",
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <span style={{ color: "#3949ab" }}>📝</span> Suggested Next Steps
                      </Typography>
                      <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {msg.analysis.nextSteps.map((step: string, idx: number) => (
                          <li key={idx} style={{ marginBottom: 8 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                              {step}
                            </Typography>
                          </li>
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
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: msg.role === "user" ? "#1e88e5" : "#333",
                      color: "white",
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                )}

                {msg.role === "assistant" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {msg.role === "user" && (
                <Avatar sx={{ bgcolor: "#1e88e5", ml: 1.5, mt: 0.5 }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Box>
          </Grow>
        ))}
        <div ref={messagesEndRef} />
      </Box>

            <Paper
              elevation={8}
              sx={{
                p: 2,
                mx: 2,
                mb: 2,
                borderRadius: 4,
                display: "flex",
                gap: 1,
                alignItems: "center",
              }}
            >
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
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
                inputRef={inputRef}
              />
              <Fab
                color="primary"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                sx={{ flexShrink: 0 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
              </Fab>
            </Paper>

            {error && (
              <Alert severity="error" onClose={() => setError("")} sx={{ mx: 2, mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </Box>

      {/* Right Sidebar - Chat History */}
      <Box
        sx={{
          width: 280,
          bgcolor: "white",
          borderLeft: "1px solid #e0e0e0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewChatDialogOpen(true)}
            sx={{
              bgcolor: "#1a237e",
              "&:hover": { bgcolor: "#283593" },
              borderRadius: 2,
            }}
          >
            New Chat
          </Button>
        </Box>
        <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0", bgcolor: "#f5f5f5" }}>
          <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
            CHAT HISTORY
          </Typography>
        </Box>
        <List sx={{ flex: 1, overflow: "auto", py: 1 }}>
          {sessionsData?.getChatSessions?.map((session: ChatSession) => (
            <ListItemButton
              key={session.id}
              onClick={() => loadSession(session)}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 1,
                bgcolor: currentSession?.id === session.id ? "#E8EAF6" : "transparent",
                "&:hover": { bgcolor: "#f0f0f0" },
              }}
              secondaryAction={
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => handleDeleteChat(session.id, e)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={session.title}
                secondary={session.caseType || "General"}
                primaryTypographyProps={{ noWrap: true, variant: "body2", fontWeight: 500 }}
                secondaryTypographyProps={{ noWrap: true, variant: "caption" }}
              />
            </ListItemButton>
          ))}
          {(!sessionsData?.getChatSessions || sessionsData.getChatSessions.length === 0) && (
            <ListItem>
              <ListItemText
                primary="No chat history"
                secondary="Start a conversation"
                sx={{ textAlign: "center" }}
              />
            </ListItem>
          )}
        </List>
      </Box>

      {/* Dialogs */}
      <Dialog open={newChatDialogOpen} onClose={() => setNewChatDialogOpen(false)}>
        <DialogTitle>Start New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Chat Title (optional)"
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewChatDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateChat} variant="contained" disabled={creatingSession}>
            {creatingSession ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
