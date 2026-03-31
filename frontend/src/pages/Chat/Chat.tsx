import { useState, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Gavel as GavelIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Description as DescriptionIcon,
  Folder as FolderIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ChatArea from "../../components/ChatArea";
import ChatHistory from "../../components/ChatHistory";
import type { ChatHistoryRef } from "../../components/ChatHistory";
import FIRAnalyzer from "../../components/FIRAnalyzer";
import DocumentAnalyzer from "../../components/DocumentAnalyzer";
import LegalNoticeGenerator from "../../components/LegalNoticeGenerator";

type FeatureTab = "chat" | "documents" | "fir" | "notice";

const features = [
  { id: "chat" as FeatureTab, label: "Case Analysis", icon: <GavelIcon /> },
  { id: "fir" as FeatureTab, label: "FIR Analysis", icon: <DescriptionIcon /> },
  { id: "documents" as FeatureTab, label: "Documents", icon: <FolderIcon /> },
  { id: "notice" as FeatureTab, label: "Legal Notice", icon: <AssessmentIcon /> },
];

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

export default function Chat() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [activeFeature, setActiveFeature] = useState<FeatureTab>("chat");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const chatHistoryRef = useRef<ChatHistoryRef>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSessionSelect = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const handleSessionDeleted = () => {
    if (currentSession) {
      setCurrentSession(null);
    }
  };

  const handleNewSessionCreated = () => {
    setCurrentSession(null);
  };

  const handleRefetchSessions = () => {
    chatHistoryRef.current?.refetch();
  };

  const renderFeatureContent = () => {
    switch (activeFeature) {
      case "fir":
        return <FIRAnalyzer token={token || ""} />;
      case "documents":
        return <DocumentAnalyzer token={token || ""} />;
      case "notice":
        return <LegalNoticeGenerator token={token || ""} />;
      case "chat":
      default:
        return (
          <ChatArea
            currentSession={currentSession}
            onSessionChange={handleSessionSelect}
            onRefetchSessions={handleRefetchSessions}
          />
        );
    }
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

      {/* Middle - Feature Content Area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {renderFeatureContent()}
      </Box>

      {/* Right Sidebar - Chat History */}
      <ChatHistory
        ref={chatHistoryRef}
        token={token || ""}
        currentSessionId={currentSession?.id || null}
        onSelectSession={handleSessionSelect}
        onSessionDeleted={handleSessionDeleted}
        onNewSessionCreated={handleNewSessionCreated}
      />
    </Box>
  );
}
