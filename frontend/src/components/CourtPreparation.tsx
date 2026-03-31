import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  TextField,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  IconButton,
  Alert,
  LinearProgress,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
  QuestionAnswer as QuestionIcon,
  Checklist as ChecklistIcon,
  Lightbulb as ArgumentsIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Replay as ReplayIcon,
  Scale as ScaleIcon,
  Save as SaveIcon,
  FolderOpen as LoadIcon,
} from "@mui/icons-material";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_COURT_PREPARATIONS, CREATE_COURT_PREPARATION, UPDATE_COURT_PREPARATION, DELETE_COURT_PREPARATION } from "../graphql/courtPreparation";
import { toast } from "react-toastify";

export type CourtType = 
  | "supreme_court"
  | "high_court" 
  | "district_court"
  | "consumer_forum"
  | "family_court"
  | "labor_court"
  | "nclt"
  | "other";

export type CaseStage =
  | "filing"
  | "hearing"
  | "evidence"
  | "arguments"
  | "judgment"
  | "appeal";

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  importance: "critical" | "important" | "normal";
  category: "incident" | "legal" | "document" | "hearing" | "other";
}

interface ExaminationQuestion {
  id: string;
  type: "examination_in_chief" | "cross_examination" | "re-examination";
  question: string;
  purpose: string;
  expectedAnswer?: string;
  notes?: string;
  isCompleted: boolean;
}

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  isCompleted: boolean;
  priority: "high" | "medium" | "low";
  notes?: string;
}

interface LegalArgument {
  id: string;
  point: string;
  supportingEvidence: string[];
  rebuttal: string;
  strength: "strong" | "moderate" | "weak";
}

const courtTypes: { value: CourtType; label: string; description: string }[] = [
  { value: "supreme_court", label: "Supreme Court", description: "Highest court of India" },
  { value: "high_court", label: "High Court", description: "State-level appellate court" },
  { value: "district_court", label: "District Court", description: "Trial court for civil/criminal matters" },
  { value: "consumer_forum", label: "Consumer Forum", description: "Consumer dispute resolution" },
  { value: "family_court", label: "Family Court", description: "Family law matters" },
  { value: "labor_court", label: "Labor Court", description: "Employment disputes" },
  { value: "nclt", label: "NCLT/NCLAT", description: "Company law tribunal" },
  { value: "other", label: "Other Tribunal", description: "Specialized tribunals" },
];

interface CourtPreparationProps {
  token?: string;
}

interface SavedPreparation {
  id: string;
  case_name: string;
  court_type: string | null;
  case_stage: string | null;
  hearing_date: string | null;
  opposing_party: string | null;
  judge_name: string | null;
  timeline_events: string | null;
  examination_questions: string | null;
  checklist_items: string | null;
  legal_arguments: string | null;
  created_at: string;
}

export default function CourtPreparation(_props: CourtPreparationProps) {
  const [activeSection, setActiveSection] = useState<string>("timeline");
  const [caseName, setCaseName] = useState("");
  const [courtType, setCourtType] = useState<CourtType>("district_court");
  const [caseStage, setCaseStage] = useState<CaseStage>("hearing");
  const [hearingDate, setHearingDate] = useState("");
  const [opposingParty, setOpposingParty] = useState("");
  const [judgeName, setJudgeName] = useState("");
  
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
    date: "",
    title: "",
    description: "",
    importance: "normal",
    category: "incident",
  });

  const [examinationQuestions, setExaminationQuestions] = useState<ExaminationQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState<Partial<ExaminationQuestion>>({
    type: "cross_examination",
    question: "",
    purpose: "",
    expectedAnswer: "",
  });

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: "1", category: "Documents", item: "Original FIR/Copy", isCompleted: false, priority: "high" },
    { id: "2", category: "Documents", item: "Charge Sheet", isCompleted: false, priority: "high" },
    { id: "3", category: "Documents", item: "Witness Statements", isCompleted: false, priority: "high" },
    { id: "4", category: "Evidence", item: "Chain of Custody Documents", isCompleted: false, priority: "high" },
    { id: "5", category: "Evidence", item: "Expert Reports", isCompleted: false, priority: "medium" },
    { id: "6", category: "Legal", item: "Case Laws/Precedents", isCompleted: false, priority: "medium" },
    { id: "7", category: "Preparation", item: "Client Consultation Completed", isCompleted: false, priority: "high" },
    { id: "8", category: "Preparation", item: "Arguments Prepared", isCompleted: false, priority: "high" },
  ]);

  const [legalArguments, setLegalArguments] = useState<LegalArgument[]>([]);
  const [newArgument, setNewArgument] = useState<Partial<LegalArgument>>({
    point: "",
    supportingEvidence: [],
    rebuttal: "",
    strength: "moderate",
  });

  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: "event" | "question" } | null>(null);
  const [currentPrepId, setCurrentPrepId] = useState<string | null>(null);
  const [savedPreparations, setSavedPreparations] = useState<SavedPreparation[]>([]);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  const { refetch: refetchPreparations } = useQuery(GET_COURT_PREPARATIONS, {
    skip: true,
  });

  const [createPreparation] = useMutation(CREATE_COURT_PREPARATION);
  const [updatePreparation] = useMutation(UPDATE_COURT_PREPARATION);
  const [deletePreparation] = useMutation(DELETE_COURT_PREPARATION);

  useEffect(() => {
    if (_props.token) {
      refetchPreparations().then((result) => {
        if (result.data?.getCourtPreparations) {
          setSavedPreparations(result.data.getCourtPreparations);
        }
      }).catch(console.error);
    }
  }, [_props.token]);

  const confirmDelete = (id: string, name: string, type: "event" | "question") => {
    setItemToDelete({ id, name, type });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === "event") {
        setTimelineEvents(prev => prev.filter(e => e.id !== itemToDelete.id));
      } else if (itemToDelete.type === "question") {
        setExaminationQuestions(prev => prev.filter(q => q.id !== itemToDelete.id));
      }
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const saveToDatabase = async () => {
    if (!caseName) {
      toast.error("Please enter a case name");
      return;
    }

    const prepData = {
      case_name: caseName,
      court_type: courtType,
      case_stage: caseStage,
      hearing_date: hearingDate,
      opposing_party: opposingParty,
      judge_name: judgeName,
      timeline_events: JSON.stringify(timelineEvents),
      examination_questions: JSON.stringify(examinationQuestions),
      checklist_items: JSON.stringify(checklistItems),
      legal_arguments: JSON.stringify(legalArguments),
    };

    try {
      if (currentPrepId) {
        await updatePreparation({
          variables: { input: { id: currentPrepId, ...prepData } },
        });
        toast.success("Preparation updated!");
      } else {
        const result = await createPreparation({
          variables: { input: prepData },
        });
        if (result.data?.createCourtPreparation) {
          setCurrentPrepId(result.data.createCourtPreparation.id);
          toast.success("Preparation saved!");
        }
      }
      const refreshed = await refetchPreparations();
      if (refreshed.data?.getCourtPreparations) {
        setSavedPreparations(refreshed.data.getCourtPreparations);
      }
    } catch (error) {
      toast.error("Failed to save to database");
    }
  };

  const loadFromDatabase = (prep: SavedPreparation) => {
    setCaseName(prep.case_name);
    setCourtType(prep.court_type as CourtType || "district_court");
    setCaseStage(prep.case_stage as CaseStage || "hearing");
    setHearingDate(prep.hearing_date || "");
    setOpposingParty(prep.opposing_party || "");
    setJudgeName(prep.judge_name || "");
    setTimelineEvents(prep.timeline_events ? JSON.parse(prep.timeline_events) : []);
    setExaminationQuestions(prep.examination_questions ? JSON.parse(prep.examination_questions) : []);
    setChecklistItems(prep.checklist_items ? JSON.parse(prep.checklist_items) : [
      { id: "1", category: "Documents", item: "Original FIR/Copy", isCompleted: false, priority: "high" },
      { id: "2", category: "Documents", item: "Charge Sheet", isCompleted: false, priority: "high" },
      { id: "3", category: "Documents", item: "Witness Statements", isCompleted: false, priority: "high" },
      { id: "4", category: "Evidence", item: "Chain of Custody Documents", isCompleted: false, priority: "high" },
      { id: "5", category: "Evidence", item: "Expert Reports", isCompleted: false, priority: "medium" },
      { id: "6", category: "Legal", item: "Case Laws/Precedents", isCompleted: false, priority: "medium" },
      { id: "7", category: "Preparation", item: "Client Consultation Completed", isCompleted: false, priority: "high" },
      { id: "8", category: "Preparation", item: "Arguments Prepared", isCompleted: false, priority: "high" },
    ]);
    setLegalArguments(prep.legal_arguments ? JSON.parse(prep.legal_arguments) : []);
    setCurrentPrepId(prep.id);
    setLoadDialogOpen(false);
    toast.info("Preparation loaded!");
  };

  const checklistProgress = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const completed = checklistItems.filter(item => item.isCompleted).length;
    return (completed / checklistItems.length) * 100;
  }, [checklistItems]);

  const addTimelineEvent = () => {
    if (newEvent.title && newEvent.date) {
      const event: TimelineEvent = {
        id: `event-${Date.now()}`,
        date: newEvent.date,
        title: newEvent.title,
        description: newEvent.description || "",
        importance: newEvent.importance || "normal",
        category: newEvent.category || "incident",
      };
      setTimelineEvents(prev => [...prev, event].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      setNewEvent({ date: "", title: "", description: "", importance: "normal", category: "incident" });
    }
  };

  const addExaminationQuestion = () => {
    if (newQuestion.question) {
      const question: ExaminationQuestion = {
        id: `q-${Date.now()}`,
        type: newQuestion.type || "cross_examination",
        question: newQuestion.question,
        purpose: newQuestion.purpose || "",
        expectedAnswer: newQuestion.expectedAnswer,
        isCompleted: false,
      };
      setExaminationQuestions(prev => [...prev, question]);
      setNewQuestion({ type: "cross_examination", question: "", purpose: "", expectedAnswer: "" });
    }
  };

  const toggleQuestionCompleted = (id: string) => {
    setExaminationQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, isCompleted: !q.isCompleted } : q)
    );
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistItems(prev =>
      prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item)
    );
  };

  const addChecklistItem = (category: string) => {
    const item = prompt("Enter checklist item:");
    if (item) {
      const newItem: ChecklistItem = {
        id: `check-${Date.now()}`,
        category,
        item,
        isCompleted: false,
        priority: "medium",
      };
      setChecklistItems(prev => [...prev, newItem]);
    }
  };

  const addLegalArgument = () => {
    if (newArgument.point) {
      const argument: LegalArgument = {
        id: `arg-${Date.now()}`,
        point: newArgument.point,
        supportingEvidence: newArgument.supportingEvidence || [],
        rebuttal: newArgument.rebuttal || "",
        strength: newArgument.strength || "moderate",
      };
      setLegalArguments(prev => [...prev, argument]);
      setNewArgument({ point: "", supportingEvidence: [], rebuttal: "", strength: "moderate" });
    }
  };

  const generateSampleData = () => {
    setCaseName("Smith vs. ABC Corporation");
    setCourtType("high_court");
    setCaseStage("arguments");
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "";
    setHearingDate(futureDate);
    setOpposingParty("ABC Corporation Ltd.");
    setJudgeName("Hon. Justice R. Sharma");

    setTimelineEvents([
      { id: "1", date: "2024-01-15", title: "Incident Occurred", description: "Workplace harassment incident", importance: "critical", category: "incident" },
      { id: "2", date: "2024-01-20", title: "FIR Filed", description: "Police complaint registered", importance: "critical", category: "legal" },
      { id: "3", date: "2024-02-10", title: "Charge Sheet", description: "Police submitted charge sheet", importance: "critical", category: "document" },
      { id: "4", date: "2024-03-05", title: "First Hearing", description: "Court acknowledged case", importance: "important", category: "hearing" },
      { id: "5", date: "2024-04-20", title: "Evidence Submission", description: "Both parties submitted evidence", importance: "critical", category: "document" },
    ]);

    setExaminationQuestions([
      { id: "q1", type: "cross_examination", question: "Can you confirm the exact date and time of the incident?", purpose: "Establish timeline", expectedAnswer: "Specific date confirmed", isCompleted: false },
      { id: "q2", type: "cross_examination", question: "Who witnessed the alleged incident?", purpose: "Verify witness availability", isCompleted: false },
      { id: "q3", type: "examination_in_chief", question: "Please describe the events of that day in your own words.", purpose: "Build narrative", isCompleted: true },
      { id: "q4", type: "re-examination", question: "Is there anything else you wish to clarify?", purpose: "Clarify any confusion", isCompleted: false },
    ]);

    setLegalArguments([
      { id: "a1", point: "Employer failed to provide safe working environment", supportingEvidence: ["Company policy", "HR emails"], rebuttal: "Safety measures were in place", strength: "strong" },
      { id: "a2", point: "Victim followed proper reporting procedure", supportingEvidence: ["Email trail", "HR complaint"], rebuttal: "Delay in reporting", strength: "moderate" },
      { id: "a3", point: "Witness testimony corroborates claim", supportingEvidence: ["Statement of 3 colleagues"], rebuttal: "Witnesses were not present", strength: "weak" },
    ]);
  };

  const exportPreparation = () => {
    const data = {
      caseName,
      courtType,
      caseStage,
      hearingDate,
      opposingParty,
      judgeName,
      timeline: timelineEvents,
      questions: examinationQuestions,
      checklist: checklistItems,
      arguments: legalArguments,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `court_prep_${caseName.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: "timeline", label: "Timeline", icon: <TimelineIcon />, description: "Chronological case events" },
    { id: "questions", label: "Examination", icon: <QuestionIcon />, description: "Questions for examination" },
    { id: "checklist", label: "Checklist", icon: <ChecklistIcon />, description: "Pre-court checklist" },
    { id: "arguments", label: "Arguments", icon: <ArgumentsIcon />, description: "Legal arguments" },
  ];

  const checklistCategories = [...new Set(checklistItems.map(i => i.category))];

  const renderTimeline = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Case Timeline</Typography>
        <Button startIcon={<AddIcon />} onClick={() => setExpandedAccordion("addEvent")}>
          Add Event
        </Button>
      </Box>

      <Accordion 
        expanded={expandedAccordion === "addEvent"} 
        onChange={() => setExpandedAccordion(expandedAccordion === "addEvent" ? false : "addEvent")}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Add New Event</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={newEvent.date}
                onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {["incident", "legal", "document", "hearing"].map(cat => (
                  <Chip
                    key={cat}
                    label={cat}
                    onClick={() => setNewEvent(prev => ({ ...prev, category: cat as TimelineEvent["category"] }))}
                    variant={newEvent.category === cat ? "filled" : "outlined"}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Chip 
                  label="Critical" 
                  onClick={() => setNewEvent(prev => ({ ...prev, importance: "critical" }))}
                  color={newEvent.importance === "critical" ? "error" : "default"}
                />
                <Chip 
                  label="Important" 
                  onClick={() => setNewEvent(prev => ({ ...prev, importance: "important" }))}
                  color={newEvent.importance === "important" ? "warning" : "default"}
                />
                <Chip 
                  label="Normal" 
                  onClick={() => setNewEvent(prev => ({ ...prev, importance: "normal" }))}
                  color={newEvent.importance === "normal" ? "info" : "default"}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button variant="contained" onClick={addTimelineEvent}>Add Event</Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <List sx={{ mt: 2 }}>
        {timelineEvents.map((event, index) => (
          <Paper key={event.id} sx={{ mb: 2, overflow: "hidden" }}>
            <Box sx={{ display: "flex" }}>
              <Box
                sx={{
                  width: 4,
                  bgcolor: 
                    event.importance === "critical" ? "#F44336" :
                    event.importance === "important" ? "#FF9800" : "#2196F3",
                }}
              />
              <ListItem
                secondaryAction={
                  <IconButton onClick={() => confirmDelete(event.id, event.title, "event")}>
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemIcon>
                  <Avatar sx={{ 
                    bgcolor: 
                      event.importance === "critical" ? "#FFEBEE" :
                      event.importance === "important" ? "#FFF3E0" : "#E3F2FD",
                    color: 
                      event.importance === "critical" ? "#F44336" :
                      event.importance === "important" ? "#FF9800" : "#2196F3",
                  }}>
                    {index + 1}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography fontWeight={600}>{event.title}</Typography>
                      <Chip label={event.category} size="small" />
                      {event.importance === "critical" && (
                        <Chip label="CRITICAL" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="primary">
                        {new Date(event.date).toLocaleDateString("en-IN", { 
                          day: "numeric", month: "long", year: "numeric" 
                        })}
                      </Typography>
                      {event.description && (
                        <Typography variant="body2" color="text.secondary">
                          {event.description}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            </Box>
          </Paper>
        ))}
        {timelineEvents.length === 0 && (
          <Alert severity="info">No timeline events added yet. Add events to build your case timeline.</Alert>
        )}
      </List>
    </Box>
  );

  const renderExamination = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Examination Questions</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip 
            label={`${examinationQuestions.filter(q => q.isCompleted).length}/${examinationQuestions.length} Done`}
            color="success"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
            <Typography variant="subtitle2" gutterBottom>Add Question</Typography>
            <TextField
              fullWidth
              select
              size="small"
              label="Type"
              value={newQuestion.type}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, type: e.target.value as ExaminationQuestion["type"] }))}
              SelectProps={{ native: true }}
              sx={{ mb: 2 }}
            >
              <option value="examination_in_chief">Examination in Chief</option>
              <option value="cross_examination">Cross Examination</option>
              <option value="re-examination">Re-examination</option>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Question"
              value={newQuestion.question}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Purpose"
              value={newQuestion.purpose}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, purpose: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="small"
              label="Expected Answer"
              value={newQuestion.expectedAnswer}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, expectedAnswer: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" onClick={addExaminationQuestion}>
              Add Question
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {["cross_examination", "examination_in_chief", "re-examination"].map(type => {
            const questions = examinationQuestions.filter(q => q.type === type);
            const typeLabels = {
              cross_examination: "Cross Examination",
              examination_in_chief: "Examination in Chief",
              re_examination: "Re-examination",
            };
            return (
              <Accordion key={type} defaultExpanded={type === "cross_examination"}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>
                    {typeLabels[type as keyof typeof typeLabels]} ({questions.length})
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {questions.map(q => (
                    <Paper key={q.id} sx={{ mb: 1, p: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                        <Checkbox
                          checked={q.isCompleted}
                          onChange={() => toggleQuestionCompleted(q.id)}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ 
                            textDecoration: q.isCompleted ? "line-through" : "none",
                            color: q.isCompleted ? "text.secondary" : "text.primary"
                          }}>
                            {q.question}
                          </Typography>
                          {q.purpose && (
                            <Typography variant="caption" color="text.secondary">
                              Purpose: {q.purpose}
                            </Typography>
                          )}
                          {q.expectedAnswer && (
                            <Typography variant="caption" color="primary" display="block">
                              Expected: {q.expectedAnswer}
                            </Typography>
                          )}
                        </Box>
                        <IconButton size="small" onClick={() => confirmDelete(q.id, q.question.substring(0, 30) + "...", "question")}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                  {questions.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No questions added for this type.
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Grid>
      </Grid>
    </Box>
  );

  const renderChecklist = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h6">Pre-Court Checklist</Typography>
          <Typography variant="body2" color="text.secondary">
            {checklistItems.filter(i => i.isCompleted).length} of {checklistItems.length} items completed
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: 200 }}>
            <LinearProgress variant="determinate" value={checklistProgress} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Typography variant="h6">{Math.round(checklistProgress)}%</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {checklistCategories.map(category => {
          const items = checklistItems.filter(i => i.category === category);
          const completed = items.filter(i => i.isCompleted).length;
          return (
            <Grid size={{ xs: 12, md: 6 }} key={category}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{category}</Typography>
                    <Chip label={`${completed}/${items.length}`} size="small" />
                  </Box>
                  {items.map(item => (
                    <Box key={item.id} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Checkbox
                        checked={item.isCompleted}
                        onChange={() => toggleChecklistItem(item.id)}
                        color={item.priority === "high" ? "error" : "primary"}
                      />
                      <Typography
                        sx={{
                          flex: 1,
                          textDecoration: item.isCompleted ? "line-through" : "none",
                          color: item.isCompleted ? "text.secondary" : "text.primary",
                        }}
                      >
                        {item.item}
                      </Typography>
                      {item.priority === "high" && (
                        <Chip label="URGENT" size="small" color="error" />
                      )}
                    </Box>
                  ))}
                  <Button size="small" startIcon={<AddIcon />} onClick={() => addChecklistItem(category)}>
                    Add Item
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {checklistProgress === 100 && (
        <Alert severity="success" sx={{ mt: 3 }}>
          All checklist items completed! You're ready for court.
        </Alert>
      )}
    </Box>
  );

  const renderArguments = () => (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Legal Arguments</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Chip 
            icon={<ScaleIcon />}
            label={`${legalArguments.filter(a => a.strength === "strong").length} Strong`}
            color="success"
          />
          <Chip 
            icon={<ScaleIcon />}
            label={`${legalArguments.filter(a => a.strength === "moderate").length} Moderate`}
            color="warning"
          />
          <Chip 
            icon={<ScaleIcon />}
            label={`${legalArguments.filter(a => a.strength === "weak").length} Weak`}
            color="error"
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
            <Typography variant="subtitle2" gutterBottom>Add Argument</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Legal Point"
              value={newArgument.point}
              onChange={(e) => setNewArgument(prev => ({ ...prev, point: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Supporting Evidence"
              value={newArgument.supportingEvidence?.join(", ")}
              onChange={(e) => setNewArgument(prev => ({ 
                ...prev, 
                supportingEvidence: e.target.value.split(",").map(s => s.trim()).filter(Boolean)
              }))}
              helperText="Comma separated"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Anticipated Rebuttal"
              value={newArgument.rebuttal}
              onChange={(e) => setNewArgument(prev => ({ ...prev, rebuttal: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              {(["strong", "moderate", "weak"] as const).map(str => (
                <Chip
                  key={str}
                  label={str.charAt(0).toUpperCase() + str.slice(1)}
                  onClick={() => setNewArgument(prev => ({ ...prev, strength: str }))}
                  color={newArgument.strength === str ? (
                    str === "strong" ? "success" : str === "moderate" ? "warning" : "error"
                  ) : "default"}
                />
              ))}
            </Box>
            <Button fullWidth variant="contained" onClick={addLegalArgument}>
              Add Argument
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {legalArguments.map(arg => (
            <Paper key={arg.id} sx={{ mb: 2, overflow: "hidden" }}>
              <Box sx={{ display: "flex" }}>
                <Box
                  sx={{
                    width: 4,
                    bgcolor: arg.strength === "strong" ? "#4CAF50" : arg.strength === "moderate" ? "#FF9800" : "#F44336",
                  }}
                />
                <Box sx={{ p: 2, flex: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{arg.point}</Typography>
                    <Chip 
                      label={arg.strength.toUpperCase()}
                      size="small"
                      color={arg.strength === "strong" ? "success" : arg.strength === "moderate" ? "warning" : "error"}
                    />
                  </Box>
                  {arg.supportingEvidence.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">Supporting Evidence:</Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 0.5 }}>
                        {arg.supportingEvidence.map((ev, idx) => (
                          <Chip key={idx} label={ev} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {arg.rebuttal && (
                    <Box sx={{ bgcolor: "#fff3e0", p: 1, borderRadius: 1 }}>
                      <Typography variant="caption" color="warning.dark">Anticipated Rebuttal:</Typography>
                      <Typography variant="body2">{arg.rebuttal}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
          {legalArguments.length === 0 && (
            <Alert severity="info">No arguments added yet. Build your legal arguments with supporting evidence.</Alert>
          )}
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={600} sx={{ color: "#1a237e" }}>
            Court Preparation AI
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Prepare comprehensively for your court hearings
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<LoadIcon />} onClick={() => setLoadDialogOpen(true)}>
            Load ({savedPreparations.length})
          </Button>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveToDatabase}>
            Save
          </Button>
          <Button variant="outlined" startIcon={<ReplayIcon />} onClick={generateSampleData}>
            Sample
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportPreparation}>
            Export
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Case Name"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              select
              label="Court Type"
              value={courtType}
              onChange={(e) => setCourtType(e.target.value as CourtType)}
              SelectProps={{ native: true }}
            >
              {courtTypes.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              type="date"
              label="Next Hearing"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Opposing Party"
              value={opposingParty}
              onChange={(e) => setOpposingParty(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Judge Name"
              value={judgeName}
              onChange={(e) => setJudgeName(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      <Stepper activeStep={["filing", "hearing", "evidence", "arguments", "judgment", "appeal"].indexOf(caseStage)} sx={{ mb: 3 }}>
        {["Filing", "Hearing", "Evidence", "Arguments", "Judgment", "Appeal"].map((label, index) => (
          <Step key={label}>
            <StepLabel 
              onClick={() => setCaseStage(["filing", "hearing", "evidence", "arguments", "judgment", "appeal"][index] as CaseStage)}
              sx={{ cursor: "pointer" }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper>
            <List>
              {sections.map(section => (
                <ListItemButton
                  key={section.id}
                  selected={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                >
                  <ListItemIcon>{section.icon}</ListItemIcon>
                  <ListItemText 
                    primary={section.label}
                    secondary={section.description}
                    primaryTypographyProps={{ fontWeight: activeSection === section.id ? 600 : 400 }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ p: 3 }}>
            {activeSection === "timeline" && renderTimeline()}
            {activeSection === "questions" && renderExamination()}
            {activeSection === "checklist" && renderChecklist()}
            {activeSection === "arguments" && renderArguments()}
          </Paper>
        </Grid>
      </Grid>

      {hearingDate && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Next hearing scheduled for {new Date(hearingDate).toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
          })}
          {new Date(hearingDate).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 && (
            <Typography component="span" fontWeight={600} color="warning.main">
              {" "}- Less than 3 days remaining!
            </Typography>
          )}
        </Alert>
      )}

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

      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Saved Preparation</DialogTitle>
        <DialogContent>
          {savedPreparations.length === 0 ? (
            <Typography color="text.secondary">No saved preparations yet.</Typography>
          ) : (
            <List>
              {savedPreparations.map((prep) => (
                <ListItem
                  key={prep.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={async () => {
                        try {
                          await deletePreparation({ variables: { preparationId: prep.id } });
                          toast.success("Deleted!");
                          setSavedPreparations(prev => prev.filter(p => p.id !== prep.id));
                        } catch {
                          toast.error("Failed to delete");
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={prep.case_name}
                    secondary={`${prep.court_type?.replace(/_/g, " ") || "Unknown"} | ${new Date(prep.created_at).toLocaleDateString()}`}
                    onClick={() => loadFromDatabase(prep)}
                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f5f5f5" } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
