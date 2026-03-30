import {
  Typography,
  Card,
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import {
  Work,
  LocalPolice,
  Home,
  FamilyRestroom,
  AccountBalance,
  MoreHoriz,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface CaseOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const CASE_TYPES: CaseOption[] = [
  {
    id: "Employment Issue",
    title: "Employment Issue",
    description: "Salary disputes, wrongful termination, workplace harassment",
    icon: <Work sx={{ fontSize: 40 }} />,
    color: "#4CAF50",
  },
  {
    id: "FIR / Police",
    title: "FIR / Police",
    description: "Criminal complaints, police complaints, FIR related",
    icon: <LocalPolice sx={{ fontSize: 40 }} />,
    color: "#F44336",
  },
  {
    id: "Property Dispute",
    title: "Property Dispute",
    description: "Land disputes, rental issues, ownership conflicts",
    icon: <Home sx={{ fontSize: 40 }} />,
    color: "#FF9800",
  },
  {
    id: "Family Matter",
    title: "Family Matter",
    description: "Divorce, custody, inheritance, domestic issues",
    icon: <FamilyRestroom sx={{ fontSize: 40 }} />,
    color: "#9C27B0",
  },
  {
    id: "Money Recovery",
    title: "Money Recovery",
    description: "Loan defaults, unpaid debts, financial disputes",
    icon: <AccountBalance sx={{ fontSize: 40 }} />,
    color: "#2196F3",
  },
  {
    id: "Other",
    title: "Other Legal Issue",
    description: "Consumer rights, contracts, or any other matter",
    icon: <MoreHoriz sx={{ fontSize: 40 }} />,
    color: "#607D8B",
  },
];

export default function CaseSelection() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const selectCase = (type: string) => {
    localStorage.setItem("caseType", type);
    navigate("/chat");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc" }}>
      <AppBar position="static" sx={{ bgcolor: "#1f3a6d" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            LegalGPT
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2">
              {user ? `Welcome, ${user.firstName}` : ""}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{ mb: 2, color: "#1a1a2e" }}
          >
            How can we help you today?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
            Select the type of legal issue you're facing
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
            gap: 3,
          }}
        >
          {CASE_TYPES.map((caseType) => (
            <Card
              key={caseType.id}
              onClick={() => selectCase(caseType.id)}
              sx={{
                p: 3,
                cursor: "pointer",
                borderRadius: 3,
                transition: "all 0.3s ease",
                border: "2px solid transparent",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                  border: `2px solid ${caseType.color}`,
                  "& .icon-box": {
                    bgcolor: caseType.color,
                    color: "#fff",
                    transform: "scale(1.1)",
                  },
                },
              }}
            >
              <Box
                className="icon-box"
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2,
                  bgcolor: `${caseType.color}15`,
                  color: caseType.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                  transition: "all 0.3s ease",
                }}
              >
                {caseType.icon}
              </Box>

              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 1, color: "#1a1a2e" }}
              >
                {caseType.title}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.5 }}
              >
                {caseType.description}
              </Typography>

              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: caseType.color,
                  transform: "scaleX(0)",
                  transition: "transform 0.3s ease",
                  ".MuiCard-root:hover &": {
                    transform: "scaleX(1)",
                  },
                }}
              />
            </Card>
          ))}
        </Box>

        <Box sx={{ textAlign: "center", mt: 6 }}>
          <Typography variant="body2" color="text.secondary">
            Our AI analyzes your case based on Indian laws and provides initial guidance.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            For definitive legal advice, please consult a licensed advocate.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
