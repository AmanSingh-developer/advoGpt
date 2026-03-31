import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import axios from "axios";
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";

const ANALYZE_FIR = gql`
  query AnalyzeFIR($firText: String!) {
    analyzeFir(firText: $firText) {
      ipcSections
      caseSeriousness
      possibleDefenses
      legalImplications
      nextSteps
    }
  }
`;

const seriousnessConfig: Record<string, { color: string; bg: string }> = {
  HIGH: { color: "#F44336", bg: "#FFEBEE" },
  MEDIUM: { color: "#FF9800", bg: "#FFF3E0" },
  LOW: { color: "#4CAF50", bg: "#E8F5E9" },
};

interface FIRAnalysisResult {
  ipcSections: string[];
  caseSeriousness: string;
  possibleDefenses: string[];
  legalImplications: string;
  nextSteps: string[];
}

interface AnalyzeFIRResponse {
  analyzeFir: FIRAnalysisResult;
}

interface FIRAnalyzerProps {
  token: string;
}

export default function FIRAnalyzer({ token }: FIRAnalyzerProps) {
  const [firText, setFirText] = useState("");
  const [firResult, setFirResult] = useState<FIRAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyzeFIR] = useLazyQuery<AnalyzeFIRResponse>(ANALYZE_FIR);

  const handleAnalyzeFIR = async () => {
    if (!firText.trim()) {
      setError("Please enter FIR text to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setFirResult(null);

    try {
      const { data } = await analyzeFIR({ variables: { firText } });
      if (data?.analyzeFir) {
        setFirResult(data.analyzeFir);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze FIR";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", "fir");

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '')}/api/upload-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setFirText(response.data.text_preview || "");
      }
    } catch {
      setError("Failed to upload file");
    }
  };

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: "#1a237e" }}>
        FIR Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload FIR or paste text to analyze IPC sections and case details
      </Typography>

      <Box sx={{ mb: 3 }}>
        <input
          type="file"
          accept=".pdf,.txt"
          id="fir-upload"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <label htmlFor="fir-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2 }}
          >
            Upload FIR (PDF/TXT)
          </Button>
        </label>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={8}
        placeholder="Paste FIR text here..."
        value={firText}
        onChange={(e) => setFirText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleAnalyzeFIR}
        disabled={loading || !firText.trim()}
        sx={{ bgcolor: "#1a237e", mb: 2 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Analyze FIR"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {firResult && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            FIR Analysis Report
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              IPC Sections Found:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {firResult.ipcSections?.map((section: string, idx: number) => (
                <Chip key={idx} label={section} sx={{ bgcolor: "#E8EAF6", color: "#1a237e" }} />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Case Seriousness:
            </Typography>
            <Chip
              label={firResult.caseSeriousness}
              sx={{
                bgcolor: seriousnessConfig[firResult.caseSeriousness]?.bg,
                color: seriousnessConfig[firResult.caseSeriousness]?.color,
                fontWeight: 600,
              }}
            />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Legal Implications:
            </Typography>
            <Typography variant="body2">{firResult.legalImplications}</Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Possible Defenses:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {firResult.possibleDefenses?.map((defense: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{defense}</Typography></li>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Next Steps:
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 3 }}>
              {firResult.nextSteps?.map((step: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{step}</Typography></li>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
