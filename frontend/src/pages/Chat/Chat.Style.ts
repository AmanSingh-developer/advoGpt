import { makeStyles } from "@mui/styles";

export const useChatStyles = makeStyles(() => ({
  root: {
    display: "flex",
    height: "100vh",
    background: "#f6f8fc",
  },

  // LEFT SIDEBAR
  sidebar: {
    width: 240,
    background: "linear-gradient(180deg, #6a5acd, #5b3fc0)",
    color: "white",
    padding: 20,
  },

  logo: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 30,
  },

  menuItem: {
    padding: "12px 10px",
    borderRadius: 8,
    marginBottom: 10,
    cursor: "pointer",
    "&:hover": {
      background: "rgba(255,255,255,0.1)",
    },
  },

  // CENTER CHAT AREA
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  messages: {
    flex: 1,
    padding: 30,
    overflowY: "auto",
  },

  userMsg: {
    background: "#2b63c0",
    color: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    width: "fit-content",
  },

  aiMsg: {
    background: "#ffffff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    maxWidth: 600,
  },

  inputBar: {
    padding: 15,
    borderTop: "1px solid #ddd",
    display: "flex",
    gap: 10,
    background: "#fff",
  },

  // RIGHT PANEL
  historyPanel: {
    width: 260,
    borderLeft: "1px solid #eee",
    background: "#fafafa",
    padding: 20,
  },

  historyTitle: {
    fontWeight: 600,
    marginBottom: 15,
  },

  historyItem: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    cursor: "pointer",
    "&:hover": {
      background: "#eee",
    },
  },
}));