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
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useChatStyles } from "./Chat.Style";
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import { CircularProgress, Alert } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import SendIcon from "@mui/icons-material/Send";
import GavelIcon from "@mui/icons-material/Gavel";
import PersonIcon from "@mui/icons-material/Person";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ANALYZE_CASE_QUERY = gql`
  query AnalyzeCase($story: String!, $caseType: String!) {
    analyzeCase(input: { story: $story, caseType: $caseType }) {
      strength
      reason
      legalAreas
      nextSteps
    }
  }
`;

interface AnalyzeCaseResponse {
  analyzeCase: {
    strength: string;
    reason: string;
    legalAreas: string[];
    nextSteps: string[];
  };
}

type Message = {
  id: number;
  role: "user" | "ai";
  text: string;
  analysis?: {
    strength: string;
    reason: string;
    legalAreas: string[];
    nextSteps: string[];
  };
  timestamp: Date;
};

const strengthConfig = {
  STRONG: { color: "#4CAF50", bg: "#E8F5E9", label: "Strong" },
  MEDIUM: { color: "#FF9800", bg: "#FFF3E0", label: "Medium" },
  WEAK: { color: "#F44336", bg: "#FFEBEE", label: "Weak" },
};

export default function Chat() {
  useChatStyles();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [caseType, setCaseType] = useState<string>("");
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedCaseType = localStorage.getItem("caseType");
    if (storedCaseType) {
      setCaseType(storedCaseType);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [analyzeCase, { loading }] = useLazyQuery<AnalyzeCaseResponse>(ANALYZE_CASE_QUERY);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setError("");
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const { data, error: gqlError } = await analyzeCase({
        variables: { story: input, caseType },
      });

      if (gqlError) {
        throw new Error(gqlError.message);
      }

      if (data?.analyzeCase) {
        const aiMsg: Message = {
          id: Date.now() + 1,
          role: "ai",
          text: "",
          analysis: {
            strength: data.analyzeCase.strength,
            reason: data.analyzeCase.reason,
            legalAreas: data.analyzeCase.legalAreas,
            nextSteps: data.analyzeCase.nextSteps,
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze case. Please try again.");
      const errorMsg: Message = {
        id: Date.now() + 1,
        role: "ai",
        text: "Sorry, I couldn't analyze your case. Please try again or try rephrasing your question.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
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
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "#f0f2f5" }}>
      <Box
        sx={{
          bgcolor: "#1a237e",
          color: "white",
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton size="small" onClick={() => navigate("/select-case")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ bgcolor: "#3949ab", width: 36, height: 36 }}>
            <GavelIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              LegalGPT Assistant
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {caseType || "Legal Consultation"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {user?.firstName}
          </Typography>
          <Fab size="small" color="error" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </Fab>
        </Box>
      </Box>

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
                Describe your legal situation below to get started...
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
              {msg.role === "ai" && (
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
                        {msg.analysis.legalAreas.map((area, idx) => (
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
                        {msg.analysis.nextSteps.map((step, idx) => (
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
                      bgcolor: "#333",
                      color: "white",
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                  </Paper>
                )}

                {msg.role === "ai" && (
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

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

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
    </Box>
  );
}
