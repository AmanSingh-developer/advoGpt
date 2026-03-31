import { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  TextField,
  IconButton,
  LinearProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  Description as DocIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Gavel as GavelIcon,
  Timeline as TimelineIcon,
  LocalOffer as TagIcon,
  Comment as CommentIcon,
  Verified as VerifiedIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_EVIDENCES, CREATE_EVIDENCE, DELETE_EVIDENCE } from "../graphql/evidence";
import { toast } from "react-toastify";

export type EvidenceType =
  | "document"
  | "photograph"
  | "video"
  | "audio"
  | "digital"
  | "physical"
  | "testimonial"
  | "electronic";

export type EvidenceCategory =
  | "original"
  | "hearsay"
  | "circumstantial"
  | "direct"
  | "documentary"
  | "real"
  | "demonstrative"
  | "class";

export type AdmissibilityLevel = "admissible" | "conditionally_admissible" | "inadmissible" | "requires_expert";

interface Evidence {
  id: string;
  name: string;
  type: EvidenceType;
  category: EvidenceCategory;
  file?: File;
  previewUrl?: string;
  description: string;
  tags: string[];
  notes: string;
  chainOfCustody: CustodyRecord[];
  analysis: EvidenceAnalysis;
  createdAt: Date;
  caseId?: string;
}

interface CustodyRecord {
  id: string;
  action: "created" | "transferred" | "accessed" | "modified";
  heldBy: string;
  timestamp: Date;
  location: string;
  notes?: string;
}

interface EvidenceAnalysis {
  strength: "strong" | "moderate" | "weak";
  admissibility: AdmissibilityLevel;
  authenticityScore: number;
  relevanceScore: number;
  preservationScore: number;
  keyPoints: string[];
  weaknesses: string[];
  recommendations: string[];
  relevantLaws: string[];
}

const evidenceTypes: { value: EvidenceType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "document", label: "Document", icon: <DocIcon />, description: "Written or printed papers" },
  { value: "photograph", label: "Photograph", icon: <ImageIcon />, description: "Images or pictures" },
  { value: "video", label: "Video", icon: <ImageIcon />, description: "Video recordings" },
  { value: "audio", label: "Audio", icon: <DocIcon />, description: "Audio recordings" },
  { value: "digital", label: "Digital", icon: <DocIcon />, description: "Electronic files, emails, chats" },
  { value: "physical", label: "Physical", icon: <GavelIcon />, description: "Physical objects" },
  { value: "testimonial", label: "Testimonial", icon: <CommentIcon />, description: "Witness statements" },
  { value: "electronic", label: "Electronic", icon: <DocIcon />, description: "Computer records, databases" },
];

const evidenceCategories: { value: EvidenceCategory; label: string; description: string }[] = [
  { value: "original", label: "Original", description: "Primary source evidence" },
  { value: "direct", label: "Direct", description: "Proves fact without inference" },
  { value: "circumstantial", label: "Circumstantial", description: "Requires inference" },
  { value: "hearsay", label: "Hearsay", description: "Out-of-court statement" },
  { value: "documentary", label: "Documentary", description: "Written evidence" },
  { value: "real", label: "Real", description: "Physical objects" },
  { value: "demonstrative", label: "Demonstrative", description: "Aids understanding" },
  { value: "class", label: "Class Evidence", description: "Matches class, not individual" },
];

const commonTags = [
  "critical", "supporting", "contradictory", "authenticated", "unauthenticated",
  "timestamped", "metadata", "witness", "expert", "official_record",
];

const getEvidenceIcon = (type: EvidenceType) => {
  switch (type) {
    case "photograph":
    case "video":
      return <ImageIcon />;
    case "document":
      return <DocIcon />;
    default:
      return <GavelIcon />;
  }
};

const getAdmissibilityConfig = (level: AdmissibilityLevel) => {
  switch (level) {
    case "admissible":
      return { color: "#4CAF50", bg: "#E8F5E9", icon: <CheckCircleIcon />, label: "Admissible" };
    case "conditionally_admissible":
      return { color: "#FF9800", bg: "#FFF3E0", icon: <WarningIcon />, label: "Conditionally Admissible" };
    case "inadmissible":
      return { color: "#F44336", bg: "#FFEBEE", icon: <CancelIcon />, label: "Inadmissible" };
    case "requires_expert":
      return { color: "#2196F3", bg: "#E3F2FD", icon: <VerifiedIcon />, label: "Requires Expert" };
  }
};

const getStrengthConfig = (strength: "strong" | "moderate" | "weak") => {
  switch (strength) {
    case "strong":
      return { color: "#4CAF50", label: "Strong" };
    case "moderate":
      return { color: "#FF9800", label: "Moderate" };
    case "weak":
      return { color: "#F44336", label: "Weak" };
  }
};

const analyzeEvidence = (evidence: Partial<Evidence>): EvidenceAnalysis => {
  let strength: "strong" | "moderate" | "weak" = "moderate";
  let admissibility: AdmissibilityLevel = "conditionally_admissible";
  let authenticityScore = 70;
  let relevanceScore = 70;
  let preservationScore = 70;
  const keyPoints: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const relevantLaws: string[] = [];

  if (evidence.type === "document" || evidence.type === "photograph") {
    authenticityScore += 10;
    keyPoints.push("Documentary evidence with potential for authentication");
    
    if (evidence.category === "original") {
      authenticityScore += 15;
      keyPoints.push("Original document - highest evidentiary value");
      admissibility = "admissible";
      strength = "strong";
    }
    
    if (evidence.category === "hearsay") {
      authenticityScore -= 20;
      weaknesses.push("Hearsay evidence - may be excluded");
      recommendations.push("Obtain affidavit or bring witness to testify");
      admissibility = "inadmissible";
      strength = "weak";
    }
  }

  if (evidence.type === "digital" || evidence.type === "electronic") {
    keyPoints.push("Electronic evidence requires proper authentication");
    relevantLaws.push("Information Technology Act, 2000 - Section 65B");
    
    if (evidence.notes?.toLowerCase().includes("timestamp") || evidence.notes?.toLowerCase().includes("metadata")) {
      authenticityScore += 15;
      keyPoints.push("Metadata available for verification");
    } else {
      weaknesses.push("Missing timestamp verification");
      recommendations.push("Obtain certificate under Section 65B IT Act");
      admissibility = "requires_expert";
    }
  }

  if (evidence.type === "physical") {
    keyPoints.push("Real evidence - high probative value");
    admissibility = "admissible";
    strength = "strong";
    authenticityScore = 90;
  }

  if (evidence.chainOfCustody && evidence.chainOfCustody.length > 0) {
    preservationScore += 20;
    keyPoints.push("Chain of custody documented");
  } else {
    weaknesses.push("No chain of custody record");
    recommendations.push("Document chain of custody immediately");
    preservationScore -= 30;
  }

  if (evidence.tags?.includes("authenticated") || evidence.tags?.includes("timestamped")) {
    authenticityScore += 15;
    keyPoints.push("Evidence properly authenticated");
  }

  if (evidence.tags?.includes("unauthenticated")) {
    weaknesses.push("Evidence not yet authenticated");
    recommendations.push("Obtain authentication certificate");
  }

  if (evidence.type === "testimonial") {
    keyPoints.push("Testimonial evidence requires witness availability");
    relevantLaws.push("Indian Evidence Act, 1872 - Section 32");
    admissibility = "conditionally_admissible";
    authenticityScore = 60;
  }

  if (strength === "moderate") {
    authenticityScore = Math.min(100, authenticityScore + 10);
  }

  return {
    strength: strength === "moderate" && authenticityScore > 75 ? "strong" : strength === "moderate" && authenticityScore < 50 ? "weak" : strength,
    admissibility,
    authenticityScore: Math.min(100, Math.max(0, authenticityScore)),
    relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
    preservationScore: Math.min(100, Math.max(0, preservationScore)),
    keyPoints,
    weaknesses,
    recommendations,
    relevantLaws,
  };
};

interface EvidenceAnalyzerProps {
  token?: string;
}

interface SavedEvidence {
  id: string;
  name: string;
  evidence_type: string;
  category: string;
  description: string | null;
  tags: string | null;
  notes: string | null;
  chain_of_custody: string | null;
  analysis: string | null;
  created_at: string;
}

export default function EvidenceAnalyzer(_props: EvidenceAnalyzerProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [newEvidence, setNewEvidence] = useState<Partial<Evidence>>({
    type: "document",
    category: "original",
    tags: [],
    notes: "",
    description: "",
    chainOfCustody: [],
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [custodyForm, setCustodyForm] = useState({
    action: "created" as CustodyRecord["action"],
    heldBy: "",
    location: "",
    notes: "",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const { refetch: refetchEvidences } = useQuery(GET_EVIDENCES, {
    skip: true,
  });

  const [createEvidence] = useMutation(CREATE_EVIDENCE);
  const [deleteEvidence] = useMutation(DELETE_EVIDENCE);

  const confirmDelete = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteEvidence({
        variables: { evidenceId: itemToDelete.id },
      });
      toast.success("Evidence deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete evidence");
    }
    setEvidences((prev) => prev.filter((e) => e.id !== itemToDelete.id));
    if (selectedEvidence?.id === itemToDelete.id) {
      setSelectedEvidence(null);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setNewEvidence((prev) => ({ ...prev, file, previewUrl: url }));
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setNewEvidence((prev) => ({ ...prev, file, previewUrl: url }));
    }
  }, []);

  const handleAddEvidence = async () => {
    const analysis = analyzeEvidence(newEvidence);
    const evidenceData = {
      name: newEvidence.name || `Evidence ${evidences.length + 1}`,
      evidence_type: newEvidence.type || "document",
      category: newEvidence.category || "original",
      description: newEvidence.description || "",
      tags: JSON.stringify(newEvidence.tags || []),
      notes: newEvidence.notes || "",
      chain_of_custody: JSON.stringify(newEvidence.chainOfCustody || [{
        id: `custody-${Date.now()}`,
        action: "created",
        heldBy: newEvidence.notes || "System",
        timestamp: new Date().toISOString(),
        location: "Uploaded",
      }]),
      analysis: JSON.stringify(analysis),
    };

    try {
      const result = await createEvidence({
        variables: { input: evidenceData },
      });

      if (result.data?.createEvidence) {
        const savedEvidence: Evidence = {
          id: result.data.createEvidence.id,
          name: evidenceData.name,
          type: evidenceData.evidence_type as Evidence["type"],
          category: evidenceData.category as Evidence["category"],
          description: evidenceData.description,
          tags: evidenceData.tags ? JSON.parse(evidenceData.tags) : [],
          notes: evidenceData.notes,
          chainOfCustody: evidenceData.chain_of_custody ? JSON.parse(evidenceData.chain_of_custody) : [],
          analysis: analysis,
          createdAt: new Date(),
        };
        setEvidences((prev) => [...prev, savedEvidence]);
        toast.success("Evidence saved to database!");
      }
    } catch (error) {
      toast.error("Failed to save evidence to database");
      const evidence: Evidence = {
        id: `evidence-${Date.now()}`,
        name: evidenceData.name,
        type: evidenceData.evidence_type as Evidence["type"],
        category: evidenceData.category as Evidence["category"],
        description: evidenceData.description,
        tags: evidenceData.tags ? JSON.parse(evidenceData.tags) : [],
        notes: evidenceData.notes,
        chainOfCustody: evidenceData.chain_of_custody ? JSON.parse(evidenceData.chain_of_custody) : [],
        analysis: analysis,
        createdAt: new Date(),
      };
      setEvidences((prev) => [...prev, evidence]);
    }

    resetForm();
  };

  const resetForm = () => {
    setDialogOpen(false);
    setNewEvidence({
      type: "document",
      category: "original",
      tags: [],
      notes: "",
      description: "",
      chainOfCustody: [],
    });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !newEvidence.tags?.includes(tag)) {
      setNewEvidence((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
    }
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setNewEvidence((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const handleAddCustodyRecord = () => {
    if (custodyForm.heldBy && custodyForm.location) {
      const record: CustodyRecord = {
        id: `custody-${Date.now()}`,
        action: custodyForm.action,
        heldBy: custodyForm.heldBy,
        timestamp: new Date(),
        location: custodyForm.location,
        notes: custodyForm.notes,
      };
      setNewEvidence((prev) => ({
        ...prev,
        chainOfCustody: [...(prev.chainOfCustody || []), record],
      }));
      setCustodyForm({ action: "created", heldBy: "", location: "", notes: "" });
    }
  };

  const viewEvidence = (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    setViewDialogOpen(true);
  };

  const totalStrength = evidences.length > 0
    ? evidences.reduce((acc, e) => {
        const score = e.analysis.strength === "strong" ? 100 : e.analysis.strength === "moderate" ? 60 : 30;
        return acc + score;
      }, 0) / evidences.length
    : 0;

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} sx={{ color: "#1a237e" }}>
            Evidence Analyzer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload, categorize, and analyze evidence for your legal case
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ bgcolor: "#1a237e" }}
        >
          Add Evidence
        </Button>
      </Box>

      {evidences.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            bgcolor: "#fafafa",
            borderRadius: 2,
            border: "2px dashed #e0e0e0",
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <GavelIcon sx={{ fontSize: 80, color: "#ccc", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Evidence Added Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drag and drop files here or click the button above to add evidence
          </Typography>
          <Button variant="outlined" onClick={() => setDialogOpen(true)}>
            Add First Evidence
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: "#fafafa", borderRadius: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Case Evidence Strength
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={totalStrength}
                  sx={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "#e0e0e0",
                    "& .MuiLinearProgress-bar": {
                      bgcolor: getStrengthConfig(
                        totalStrength > 70 ? "strong" : totalStrength > 40 ? "moderate" : "weak"
                      ).color,
                    },
                  }}
                />
                <Typography variant="h6" fontWeight={600}>
                  {Math.round(totalStrength)}%
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Based on {evidences.length} evidence item{evidences.length !== 1 ? "s" : ""}
              </Typography>
            </Paper>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Evidence Items
            </Typography>
            <List sx={{ maxHeight: 500, overflow: "auto" }}>
              {evidences.map((evidence) => {
                const admissibilityConfig = getAdmissibilityConfig(evidence.analysis.admissibility);
                return (
                  <Paper key={evidence.id} elevation={1} sx={{ mb: 1 }}>
                    <ListItem
                      secondaryAction={
                        <IconButton size="small" onClick={() => confirmDelete(evidence.id, evidence.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{ cursor: "pointer" }}
                      onClick={() => viewEvidence(evidence)}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getEvidenceIcon(evidence.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={evidence.name}
                        secondary={
                          <Box component="span" sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                            <Chip
                              label={admissibilityConfig.label}
                              size="small"
                              sx={{ height: 20, fontSize: "0.7rem", bgcolor: admissibilityConfig.bg, color: admissibilityConfig.color }}
                            />
                          </Box>
                        }
                        primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                      />
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Paper elevation={0} sx={{ p: 3, bgcolor: "#fafafa", borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Evidence Analysis Overview
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ bgcolor: "#E8F5E9" }}>
                    <CardContent sx={{ pb: "16px !important" }}>
                      <Typography variant="caption" color="text.secondary">
                        Authenticity Score
                      </Typography>
                      <Typography variant="h4" fontWeight={600}>
                        {Math.round(evidences.reduce((a, e) => a + e.analysis.authenticityScore, 0) / evidences.length)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ bgcolor: "#FFF3E0" }}>
                    <CardContent sx={{ pb: "16px !important" }}>
                      <Typography variant="caption" color="text.secondary">
                        Relevance Score
                      </Typography>
                      <Typography variant="h4" fontWeight={600}>
                        {Math.round(evidences.reduce((a, e) => a + e.analysis.relevanceScore, 0) / evidences.length)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Card sx={{ bgcolor: "#E3F2FD" }}>
                    <CardContent sx={{ pb: "16px !important" }}>
                      <Typography variant="caption" color="text.secondary">
                        Preservation Score
                      </Typography>
                      <Typography variant="h4" fontWeight={600}>
                        {Math.round(evidences.reduce((a, e) => a + e.analysis.preservationScore, 0) / evidences.length)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Evidence Admissibility Summary:</strong>{" "}
                  {evidences.filter((e) => e.analysis.admissibility === "admissible").length} admissible,{" "}
                  {evidences.filter((e) => e.analysis.admissibility === "conditionally_admissible").length} conditional,{" "}
                  {evidences.filter((e) => e.analysis.admissibility === "inadmissible").length} inadmissible,{" "}
                  {evidences.filter((e) => e.analysis.admissibility === "requires_expert").length} require expert
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={resetForm} maxWidth="md" fullWidth>
        <DialogTitle>Add New Evidence</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  border: "2px dashed #e0e0e0",
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  cursor: "pointer",
                  "&:hover": { borderColor: "#1a237e" },
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  hidden
                  id="evidence-upload"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <label htmlFor="evidence-upload" style={{ cursor: "pointer" }}>
                  {previewUrl ? (
                    <Box>
                      {newEvidence.type === "photograph" || newEvidence.type === "video" ? (
                        <img src={previewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 200 }} />
                      ) : (
                        <DocIcon sx={{ fontSize: 60, color: "#ccc" }} />
                      )}
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Click or drop to change
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ fontSize: 60, color: "#ccc", mb: 1 }} />
                      <Typography variant="body1" gutterBottom>
                        Drop files here or click to upload
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Supports: Images, PDF, Documents
                      </Typography>
                    </>
                  )}
                </label>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Evidence Name"
                value={newEvidence.name || ""}
                onChange={(e) => setNewEvidence((prev) => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={newEvidence.description || ""}
                onChange={(e) => setNewEvidence((prev) => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" gutterBottom>
                Evidence Type
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {evidenceTypes.map((type) => (
                  <Chip
                    key={type.value}
                    icon={type.icon as React.ReactElement}
                    label={type.label}
                    onClick={() => setNewEvidence((prev) => ({ ...prev, type: type.value }))}
                    variant={newEvidence.type === type.value ? "filled" : "outlined"}
                    sx={{
                      bgcolor: newEvidence.type === type.value ? "#1a237e" : "transparent",
                      color: newEvidence.type === type.value ? "white" : "inherit",
                    }}
                  />
                ))}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Evidence Category
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {evidenceCategories.map((cat) => (
                  <Chip
                    key={cat.value}
                    label={cat.label}
                    onClick={() => setNewEvidence((prev) => ({ ...prev, category: cat.value }))}
                    variant={newEvidence.category === cat.value ? "filled" : "outlined"}
                    sx={{
                      bgcolor: newEvidence.category === cat.value ? "#1a237e" : "transparent",
                      color: newEvidence.category === cat.value ? "white" : "inherit",
                    }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <TagIcon color="action" />
                <Typography variant="subtitle2">Tags</Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {newEvidence.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{ bgcolor: "#E8EAF6" }}
                  />
                ))}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  size="small"
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddTag(newTag)}
                />
                <Button onClick={() => handleAddTag(newTag)}>Add</Button>
              </Box>
              <Box sx={{ mt: 1 }}>
                {commonTags.filter((t) => !newEvidence.tags?.includes(t)).map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => handleAddTag(tag)}
                    sx={{ mr: 0.5, mb: 0.5, cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <TimelineIcon color="action" />
                <Typography variant="subtitle2">Chain of Custody</Typography>
              </Box>
              {newEvidence.chainOfCustody?.map((record) => (
                <Paper key={record.id} elevation={1} sx={{ p: 1, mb: 1, bgcolor: "#f5f5f5" }}>
                  <Typography variant="body2">
                    <strong>{record.action}</strong> - {record.heldBy} at {record.location}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(record.timestamp).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
              <Grid container spacing={1} alignItems="center">
                <Grid size={{ xs: 3 }}>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    value={custodyForm.action}
                    onChange={(e) => setCustodyForm((prev) => ({ ...prev, action: e.target.value as CustodyRecord["action"] }))}
                    SelectProps={{ native: true }}
                  >
                    <option value="created">Created</option>
                    <option value="transferred">Transferred</option>
                    <option value="accessed">Accessed</option>
                    <option value="modified">Modified</option>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Held by"
                    value={custodyForm.heldBy}
                    onChange={(e) => setCustodyForm((prev) => ({ ...prev, heldBy: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Location"
                    value={custodyForm.location}
                    onChange={(e) => setCustodyForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Button onClick={handleAddCustodyRecord} size="small">
                    Add Record
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Additional Notes"
                multiline
                rows={3}
                value={newEvidence.notes || ""}
                onChange={(e) => setNewEvidence((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm}>Cancel</Button>
          <Button variant="contained" onClick={handleAddEvidence} sx={{ bgcolor: "#1a237e" }}>
            Add Evidence
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedEvidence?.name}</DialogTitle>
        <DialogContent dividers>
          {selectedEvidence && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                {selectedEvidence.previewUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={selectedEvidence.previewUrl}
                    alt={selectedEvidence.name}
                    sx={{ borderRadius: 1 }}
                  />
                )}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type: {selectedEvidence.type}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category: {selectedEvidence.category}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Added: {selectedEvidence.createdAt.toLocaleDateString()}
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Chip
                    icon={getAdmissibilityConfig(selectedEvidence.analysis.admissibility).icon as React.ReactElement}
                    label={getAdmissibilityConfig(selectedEvidence.analysis.admissibility).label}
                    sx={{
                      bgcolor: getAdmissibilityConfig(selectedEvidence.analysis.admissibility).bg,
                      color: getAdmissibilityConfig(selectedEvidence.analysis.admissibility).color,
                    }}
                  />
                  <Chip
                    label={`Strength: ${getStrengthConfig(selectedEvidence.analysis.strength).label}`}
                    sx={{
                      bgcolor: getStrengthConfig(selectedEvidence.analysis.strength).color + "20",
                      color: getStrengthConfig(selectedEvidence.analysis.strength).color,
                    }}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Analysis Scores
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption">Authenticity</Typography>
                    <LinearProgress variant="determinate" value={selectedEvidence.analysis.authenticityScore} sx={{ height: 6, borderRadius: 3 }} />
                    <Typography variant="caption">{selectedEvidence.analysis.authenticityScore}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption">Relevance</Typography>
                    <LinearProgress variant="determinate" value={selectedEvidence.analysis.relevanceScore} sx={{ height: 6, borderRadius: 3 }} />
                    <Typography variant="caption">{selectedEvidence.analysis.relevanceScore}%</Typography>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Typography variant="caption">Preservation</Typography>
                    <LinearProgress variant="determinate" value={selectedEvidence.analysis.preservationScore} sx={{ height: 6, borderRadius: 3 }} />
                    <Typography variant="caption">{selectedEvidence.analysis.preservationScore}%</Typography>
                  </Grid>
                </Grid>

                {selectedEvidence.analysis.keyPoints.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      Key Points
                    </Typography>
                    {selectedEvidence.analysis.keyPoints.map((point, idx) => (
                      <Typography key={idx} variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CheckCircleIcon fontSize="small" color="success" /> {point}
                      </Typography>
                    ))}
                  </Box>
                )}

                {selectedEvidence.analysis.weaknesses.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="error.main" gutterBottom>
                      Weaknesses
                    </Typography>
                    {selectedEvidence.analysis.weaknesses.map((weakness, idx) => (
                      <Typography key={idx} variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <WarningIcon fontSize="small" color="error" /> {weakness}
                      </Typography>
                    ))}
                  </Box>
                )}

                {selectedEvidence.analysis.relevantLaws.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Relevant Laws
                    </Typography>
                    {selectedEvidence.analysis.relevantLaws.map((law, idx) => (
                      <Chip key={idx} label={law} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </Box>
                )}

                {selectedEvidence.chainOfCustody.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Chain of Custody
                    </Typography>
                    {selectedEvidence.chainOfCustody.map((record) => (
                      <Paper key={record.id} elevation={1} sx={{ p: 1, mb: 1, bgcolor: "#f5f5f5" }}>
                        <Typography variant="body2">
                          <strong>{record.action}</strong> - {record.heldBy} at {record.location}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(record.timestamp).toLocaleString()}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
