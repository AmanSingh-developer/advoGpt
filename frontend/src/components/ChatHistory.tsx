import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useState, useImperativeHandle, forwardRef } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import CircularProgress from "@mui/material/CircularProgress";

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

interface GetChatSessionsResponse {
  getChatSessions: ChatSession[];
}

interface GetChatSessionResponse {
  getChatSession: ChatSession;
}

interface CreateChatSessionResponse {
  createChatSession: ChatSession;
}

interface DeleteChatSessionResponse {
  deleteChatSession: {
    success: boolean;
    message: string;
  };
}

interface ChatHistoryProps {
  token: string;
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onSessionDeleted: () => void;
  onNewSessionCreated: () => void;
}

export interface ChatHistoryRef {
  refetch: () => void;
}

const ChatHistory = forwardRef<ChatHistoryRef, ChatHistoryProps>(({
  token,
  currentSessionId,
  onSelectSession,
  onSessionDeleted,
  onNewSessionCreated,
}, ref) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data, refetch } = useQuery<GetChatSessionsResponse>(GET_CHAT_SESSIONS, { skip: !token });
  const [getChatSession] = useLazyQuery<GetChatSessionResponse>(GET_CHAT_SESSION);
  const [createChat, { loading: creating }] = useMutation<CreateChatSessionResponse>(CREATE_CHAT_SESSION);
  const [deleteChat] = useMutation<DeleteChatSessionResponse>(DELETE_CHAT_SESSION);

  useImperativeHandle(ref, () => ({
    refetch,
  }));

  const handleCreate = async () => {
    try {
      const { data } = await createChat({
        variables: {
          title: newTitle || `Chat - ${new Date().toLocaleDateString()}`,
          caseType: null,
        },
      });

      if (data?.createChatSession) {
        onSelectSession(data.createChatSession);
        setDialogOpen(false);
        setNewTitle("");
        refetch();
        onNewSessionCreated();
      }
    } catch (err) {
      console.error("Failed to create chat:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteChat({ variables: { sessionId } });
      refetch();
      onSessionDeleted();
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const handleSelect = async (session: ChatSession) => {
    try {
      const { data } = await getChatSession({ variables: { sessionId: session.id } });
      if (data?.getChatSession) {
        onSelectSession(data.getChatSession);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  return (
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
          startIcon={creating ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ bgcolor: "#1a237e", "&:hover": { bgcolor: "#283593" }, borderRadius: 2 }}
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
        {data?.getChatSessions?.map((session: ChatSession) => (
          <ListItemButton
            key={session.id}
            onClick={() => handleSelect(session)}
            selected={currentSessionId === session.id}
            sx={{
              mx: 1,
              mb: 0.5,
              borderRadius: 1,
              bgcolor: currentSessionId === session.id ? "#E8EAF6" : "transparent",
              "&:hover": { bgcolor: "#f0f0f0" },
              position: "relative",
              pr: 5,
            }}
          >
            <ListItemText
              primary={session.title}
              secondary={session.caseType || "General"}
              primaryTypographyProps={{ noWrap: true, variant: "body2", fontWeight: 500 }}
              secondaryTypographyProps={{ noWrap: true, variant: "caption" }}
            />
            <IconButton 
              edge="end" 
              size="small" 
              onClick={(e) => handleDelete(e, session.id)}
              sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ListItemButton>
        ))}
        {(!data?.getChatSessions || data.getChatSessions.length === 0) && (
          <Box sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">No chat history</Typography>
          </Box>
        )}
      </List>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Start New Chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Chat Title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={creating}>
            {creating ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default ChatHistory;
