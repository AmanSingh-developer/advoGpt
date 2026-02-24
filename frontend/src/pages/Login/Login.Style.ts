import { makeStyles } from "@mui/styles";

export const useLoginStyles = makeStyles({
  root: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg, #4f46e5, #6d28d9)",
  },

  card: {
    width: 420,
    padding: 40,
    borderRadius: 20,
    backdropFilter: "blur(20px)",
    backgroundColor: "rgba(255,255,255,0.85)",
    boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
  },

  title: {
    fontSize: 26,
    fontWeight: 600,
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "#4b5563",
  },

  field: {
    marginBottom: 20,
  },

  button: {
    height: 48,
    borderRadius: 10,
    fontWeight: 600,
    textTransform: "none",
    background:
      "linear-gradient(90deg, #4f46e5, #6d28d9)",
  },

  footerText: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 14,
  },

  errorText: {
    color: "#dc2626",
    marginBottom: 10,
    fontSize: 13,
  },
});