import { makeStyles } from "@mui/styles";

export const useCaseStyles = makeStyles(() => ({
  container: {
    minHeight: "100vh",
    background: "#f6f8fc",
    padding: "60px 40px",
    textAlign: "center",
  },

  title: {
    fontSize: "32px",
    fontWeight: 700,
    marginBottom: "10px",
  },

  subtitle: {
    color: "#666",
    marginBottom: "40px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  card: {
    padding: "28px 20px",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "16px",
    transition: "all 0.2s ease",
    border: "1px solid #eee",

    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
      border: "1px solid #2b63c0",
    },
  },
}));