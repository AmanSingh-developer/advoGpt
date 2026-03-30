import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Grid,
  Box,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const ANALYZE_CASE_MUTATION = gql`
  mutation AnalyzeCase($story: String!, $caseType: String!) {
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

type Strength = "STRONG" | "MEDIUM" | "WEAK" | "";

const CASE_TYPES = [
  "Employment / Salary Issue",
  "Property Dispute",
  "Police / FIR Issue",
  "Family Matter",
  "Money Recovery",
  "Other",
];

const strengthColor = (s: Strength) => {
  if (s === "STRONG") return "success";
  if (s === "MEDIUM") return "warning";
  if (s === "WEAK") return "error";
  return "default";
};

const strengthLabel = (s: Strength) => {
  if (s === "STRONG") return "Strong";
  if (s === "MEDIUM") return "Medium";
  if (s === "WEAK") return "Weak";
  return "";
};

const CaseStrengthAnalyzer = () => {
  const [story, setStory] = useState("");
  const [caseType, setCaseType] = useState("");

  const [strength, setStrength] = useState<Strength>("");
  const [reason, setReason] = useState("");
  const [legalAreas, setLegalAreas] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const [analyzeCase, { loading }] = useMutation<AnalyzeCaseResponse>(ANALYZE_CASE_MUTATION);

  const handleAnalyze = async () => {
    if (!story.trim() || !caseType) return;

    try {
      const { data } = await analyzeCase({
        variables: { story, caseType },
      });

      if (data?.analyzeCase) {
        setStrength(data.analyzeCase.strength as Strength);
        setReason(data.analyzeCase.reason);
        setLegalAreas(data.analyzeCase.legalAreas);
        setNextSteps(data.analyzeCase.nextSteps);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  };

  return (
    <Box sx={{ bgcolor: "#f5f7fb" }}>
      <AppBar position="static" sx={{ bgcolor: "#1f3a6d" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            AI Legal Intelligence Platform
          </Typography>
          <Box>
            <Button color="inherit">Dashboard</Button>
            <Button color="inherit">Login</Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
          Case Strength Analyzer
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" mb={3}>
          Describe your legal problem and get AI-powered analysis in seconds.
        </Typography>

        <Card elevation={3} sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Describe Your Legal Situation
            </Typography>

            <TextField
              multiline
              minRows={5}
              fullWidth
              placeholder='Example: "My company has not paid my salary for 4 months and is not responding to calls."'
              value={story}
              onChange={(e) => setStory(e.target.value)}
              sx={{ mb: 2 }}
            />

            <TextField
              select
              fullWidth
              label="Select Case Type"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              sx={{ mb: 3 }}
            >
              {CASE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <Box textAlign="center">
              <Button
                variant="contained"
                size="large"
                onClick={handleAnalyze}
                disabled={loading}
                sx={{
                  px: 6,
                  py: 1.5,
                  bgcolor: "#2b63c0",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#1f4fa1" },
                }}
              >
                {loading ? <CircularProgress size={24} /> : "Analyze Case"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {(strength || reason || legalAreas.length > 0) && (
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>
                AI Case Analysis
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Case Strength
                  </Typography>
                  <Chip
                    label={strengthLabel(strength) || "N/A"}
                    color={strengthColor(strength)}
                    sx={{ mt: 1, fontWeight: 700 }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Why This Case Strength?
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    {reason}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Possible Legal Areas Involved
              </Typography>
              <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                {legalAreas.map((area) => (
                  <li key={area}>
                    <Typography variant="body2">{area}</Typography>
                  </li>
                ))}
              </Box>

              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Suggested Next Steps
              </Typography>
              <Box component="ul" sx={{ pl: 3 }}>
                {nextSteps.map((step) => (
                  <li key={step}>
                    <Typography variant="body2">{step}</Typography>
                  </li>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        <Typography
          variant="caption"
          display="block"
          textAlign="center"
          color="text.secondary"
          mt={3}
        >
          This AI provides legal insights for preparation purposes only and is not a substitute for a licensed advocate.
        </Typography>
      </Container>
    </Box>
  );
};

export default CaseStrengthAnalyzer;
