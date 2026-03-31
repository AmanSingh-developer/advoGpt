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

const ANALYZE_DOCUMENT = gql`
  query AnalyzeDocument($documentText: String!, $docType: String!) {
    analyzeDocumentText(documentText: $documentText, docType: $docType) {
      documentType
      keyTerms
      obligations
      riskFactors
      missingElements
      recommendations
      legalSections
    }
  }
`;

const documentTypes = ["Contract", "Agreement", "Notice", "Other"];

interface DocumentAnalysisResult {
  documentType: string;
  keyTerms: string[];
  obligations: string[];
  riskFactors: string[];
  missingElements: string[];
  recommendations: string[];
  legalSections: string[];
}

interface AnalyzeDocumentResponse {
  analyzeDocumentText: DocumentAnalysisResult;
}

interface DocumentAnalyzerProps {
  token: string;
}

export default function DocumentAnalyzer({ token }: DocumentAnalyzerProps) {
  const [documentText, setDocumentText] = useState("");
  const [documentType, setDocumentType] = useState("Contract");
  const [documentResult, setDocumentResult] = useState<DocumentAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyzeDocument] = useLazyQuery<AnalyzeDocumentResponse>(ANALYZE_DOCUMENT);

  const handleAnalyzeDocument = async () => {
    if (!documentText.trim()) {
      setError("Please enter document text to analyze");
      return;
    }

    setLoading(true);
    setError("");
    setDocumentResult(null);

    try {
      const { data } = await analyzeDocument({
        variables: { documentText, docType: documentType },
      });
      if (data?.analyzeDocumentText) {
        setDocumentResult(data.analyzeDocumentText);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze document";
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
    formData.append("doc_type", "document");

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
        setDocumentText(response.data.text_preview || "");
      }
    } catch {
      setError("Failed to upload file");
    }
  };

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: "#1a237e" }}>
        Document Analyzer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Analyze contracts, agreements, and legal documents
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
        {documentTypes.map((type) => (
          <Chip
            key={type}
            label={type}
            onClick={() => setDocumentType(type)}
            variant={documentType === type ? "filled" : "outlined"}
            sx={{
              bgcolor: documentType === type ? "#1a237e" : "transparent",
              color: documentType === type ? "white" : "#1a237e",
              cursor: "pointer",
            }}
          />
        ))}
      </Box>

      <Box sx={{ mb: 3 }}>
        <input
          type="file"
          accept=".pdf,.txt"
          id="doc-upload"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <label htmlFor="doc-upload">
          <Button
            component="span"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mb: 2 }}
          >
            Upload Document (PDF/TXT)
          </Button>
        </label>
      </Box>

      <TextField
        fullWidth
        multiline
        rows={8}
        placeholder="Paste document text here..."
        value={documentText}
        onChange={(e) => setDocumentText(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleAnalyzeDocument}
        disabled={loading || !documentText.trim()}
        sx={{ bgcolor: "#1a237e", mb: 2 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Analyze Document"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {documentResult && (
        <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
            Document Analysis Report
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Document Type:
            </Typography>
            <Chip label={documentResult.documentType} sx={{ bgcolor: "#E8EAF6", color: "#1a237e" }} />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Key Terms:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {documentResult.keyTerms?.map((term: string, idx: number) => (
                <Chip key={idx} label={term} size="small" sx={{ bgcolor: "#E8EAF6", color: "#1a237e" }} />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Obligations:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {documentResult.obligations?.map((obs: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{obs}</Typography></li>
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, color: "#F44336" }}>
              Risk Factors:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {documentResult.riskFactors?.map((risk: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2" color="error">{risk}</Typography></li>
              ))}
            </Box>
          </Box>

          {documentResult.missingElements?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1, color: "#FF9800" }}>
                Missing Elements:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                {documentResult.missingElements?.map((elem: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{elem}</Typography></li>
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Recommendations:
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 3 }}>
              {documentResult.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 8 }}><Typography variant="body2">{rec}</Typography></li>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
