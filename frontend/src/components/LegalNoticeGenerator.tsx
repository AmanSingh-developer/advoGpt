import { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  AttachMoney as MoneyIcon,
  Home as HomeIcon,
  Gavel as GavelIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import html2pdf from "html2pdf.js";
import { toast } from "react-toastify";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_LEGAL_NOTICES, CREATE_LEGAL_NOTICE, DELETE_LEGAL_NOTICE } from "../graphql/legalNotice";

export type NoticeType =
  | "salary_recovery"
  | "property_dispute"
  | "defamation"
  | "harassment"
  | "breach_contract"
  | "eviction"
  | "cheque_bounce"
  | "consumer_complaint"
  | "employment_dispute"
  | "custom";

interface NoticeTemplate {
  id: NoticeType;
  label: string;
  icon: React.ReactNode;
  description: string;
  keyFields: { name: string; label: string; required: boolean; multiline?: boolean }[];
  relevantSections: string[];
  suggestedContent: string[];
}

const noticeTemplates: NoticeTemplate[] = [
  {
    id: "salary_recovery",
    label: "Salary Recovery",
    icon: <MoneyIcon />,
    description: "Notice for unpaid salaries, bonuses, or other employment dues",
    keyFields: [
      { name: "companyName", label: "Company Name", required: true },
      { name: "designation", label: "Your Designation", required: true },
      { name: "joiningDate", label: "Date of Joining", required: true },
      { name: "lastWorkingDay", label: "Last Working Day", required: true },
      { name: "salaryAmount", label: "Pending Salary Amount (₹)", required: true },
      { name: "monthsDue", label: "Months of Salary Due", required: true },
      { name: "additionalDues", label: "Additional Dues (Bonus/Leave Encashment)", required: false },
    ],
    relevantSections: ["Section 15 of Payment of Wages Act, 1936", "Section 2(g) of Industrial Disputes Act, 1947", "Article 21 of Constitution of India"],
    suggestedContent: [
      "Pending salary for the period of employment",
      "Notice pay in lieu of termination",
      "Leave salary and encashment",
      "Gratuity if applicable",
      "Bonus and incentives",
    ],
  },
  {
    id: "property_dispute",
    label: "Property Dispute",
    icon: <HomeIcon />,
    description: "Notice for property possession, rent disputes, or ownership claims",
    keyFields: [
      { name: "propertyAddress", label: "Property Address", required: true, multiline: true },
      { name: "propertyType", label: "Property Type (Flat/House/Plot)", required: true },
      { name: "disputeNature", label: "Nature of Dispute", required: true, multiline: true },
      { name: "documentRef", label: "Reference Document (Agreement/Lease)", required: false },
      { name: "claimedRights", label: "Your Claimed Rights", required: true, multiline: true },
    ],
    relevantSections: ["Section 54 of Transfer of Property Act, 1882", "Section 111 of Transfer of Property Act", "Rent Control Act of respective state"],
    suggestedContent: [
      "Immediate possession of property",
      "Recovery of rent with interest",
      "Mesne profits for unauthorized occupation",
      "Injunction against further trespass",
      "Costs and damages",
    ],
  },
  {
    id: "defamation",
    label: "Defamation Notice",
    icon: <GavelIcon />,
    description: "Legal notice for damage to reputation through false statements",
    keyFields: [
      { name: "defamatoryStatement", label: "Defamatory Statement Made", required: true, multiline: true },
      { name: "statementDate", label: "Date of Statement", required: true },
      { name: "statementMedium", label: "Medium (Social Media/Print/Verbal)", required: true },
      { name: "witnesses", label: "Witnesses (if any)", required: false, multiline: true },
      { name: "damageDescription", label: "Description of Damage Caused", required: true, multiline: true },
    ],
    relevantSections: ["Section 499 IPC (Defamation)", "Section 500 IPC (Punishment)", "Article 19(1)(a) - Freedom of Speech limitations"],
    suggestedContent: [
      "Unconditional public apology",
      "Removal of defamatory content",
      "Compensation for reputational damage",
      "Legal costs",
      "Undertaking to refrain from future defamation",
    ],
  },
  {
    id: "harassment",
    label: "Harassment/ workplace Notice",
    icon: <PersonIcon />,
    description: "Notice for workplace harassment, hostile work environment, or discrimination",
    keyFields: [
      { name: "incidentDescription", label: "Description of Harassment", required: true, multiline: true },
      { name: "incidentDates", label: "Dates of Incidents", required: true },
      { name: "perpetratorName", label: "Name of Perpetrator", required: true },
      { name: "witnessNames", label: "Witness Names", required: false },
      { name: "reliefSought", label: "Relief Sought", required: true, multiline: true },
    ],
    relevantSections: ["Section 354A IPC (Sexual Harassment)", "POSH Act 2013", "Article 21 of Constitution"],
    suggestedContent: [
      "Immediate cessation of harassment",
      "Internal Committee investigation",
      "Transfer of perpetrator",
      "Compensatory relief",
      "Policy implementation",
    ],
  },
  {
    id: "breach_contract",
    label: "Breach of Contract",
    icon: <DescriptionIcon />,
    description: "Notice for breach of any contractual agreement",
    keyFields: [
      { name: "contractType", label: "Type of Contract", required: true },
      { name: "contractDate", label: "Contract Date", required: true },
      { name: "breachDescription", label: "Description of Breach", required: true, multiline: true },
      { name: "breachDate", label: "Date of Breach", required: true },
      { name: "damagesClaimed", label: "Damages Claimed (₹)", required: false },
    ],
    relevantSections: ["Section 39 of Indian Contract Act, 1872", "Section 73 - Compensation for breach", "Section 74 - Damages for breach"],
    suggestedContent: [
      "Specific performance of contract",
      "Compensation for losses incurred",
      "Interest on damages",
      "Costs of legal action",
      "Termination of contract with notice",
    ],
  },
  {
    id: "eviction",
    label: "Eviction Notice",
    icon: <HomeIcon />,
    description: "Notice for tenant eviction due to rent default or lease violation",
    keyFields: [
      { name: "tenantName", label: "Tenant Name", required: true },
      { name: "propertyAddress", label: "Property Address", required: true, multiline: true },
      { name: "leaseStartDate", label: "Lease Start Date", required: true },
      { name: "monthlyRent", label: "Monthly Rent (₹)", required: true },
      { name: "evictionReason", label: "Reason for Eviction", required: true, multiline: true },
      { name: "rentDue", label: "Rent in Arrears (₹)", required: false },
    ],
    relevantSections: ["State Rent Control Act", "Section 106 of Transfer of Property Act", "Typical eviction grounds under respective state law"],
    suggestedContent: [
      "Vacate premises within 15/30 days",
      "Pay outstanding rent with interest",
      "Hand over possession peacefully",
      "Pay damages for unauthorized alterations",
      "Costs of legal proceedings",
    ],
  },
  {
    id: "cheque_bounce",
    label: "Cheque Bounce Notice",
    icon: <MoneyIcon />,
    description: "Notice for dishonored cheques under Section 138 NI Act",
    keyFields: [
      { name: "chequeNumber", label: "Cheque Number", required: true },
      { name: "chequeDate", label: "Cheque Date", required: true },
      { name: "chequeAmount", label: "Cheque Amount (₹)", required: true },
      { name: "bankName", label: "Bank Name", required: true },
      { name: "dishonourDate", label: "Date of Dishonour", required: true },
      { name: "reasonForDishonour", label: "Reason for Dishonour", required: true },
    ],
    relevantSections: ["Section 138 of Negotiable Instruments Act, 1881", "Section 139 - Presumption in favor of holder", "Section 142 - Cognizance of offences"],
    suggestedContent: [
      "Payment of cheque amount within 15 days",
      "Interest @ 18% p.a. from date of cheque",
      "Compensation under Section 142",
      "Costs of legal notice",
      "Undertaking not to issue worthless cheques",
    ],
  },
  {
    id: "consumer_complaint",
    label: "Consumer Complaint Notice",
    icon: <BusinessIcon />,
    description: "Notice to a company/service provider for deficiency in service",
    keyFields: [
      { name: "companyName", label: "Company/Service Provider", required: true },
      { name: "serviceDescription", label: "Service/Product Purchased", required: true },
      { name: "purchaseDate", label: "Purchase Date", required: true },
      { name: "amountPaid", label: "Amount Paid (₹)", required: true },
      { name: "deficiencyDescription", label: "Description of Deficiency", required: true, multiline: true },
      { name: "refundSought", label: "Refund/Compensation Sought (₹)", required: false },
    ],
    relevantSections: ["Consumer Protection Act, 2019", "Section 2(47) - Unfair Trade Practice", "Section 2(42) - Deficiency definition"],
    suggestedContent: [
      "Full refund of amount paid",
      "Replacement of defective product",
      "Compensation for mental agony",
      "Cost of this notice",
      "Interest on refund amount",
    ],
  },
  {
    id: "employment_dispute",
    label: "Employment Dispute",
    icon: <PersonIcon />,
    description: "Notice for wrongful termination, discrimination, or employment rights violation",
    keyFields: [
      { name: "employerName", label: "Employer Name", required: true },
      { name: "employmentPeriod", label: "Period of Employment", required: true },
      { name: "terminationDate", label: "Date of Termination", required: false },
      { name: "disputeDescription", label: "Description of Dispute", required: true, multiline: true },
      { name: "employmentType", label: "Employment Type (Permanent/Contract)", required: true },
    ],
    relevantSections: ["Industrial Disputes Act, 1947", "Section 25F - Conditions for lay-off", "ESI Act, 1948", "Payment of Gratuity Act, 1972"],
    suggestedContent: [
      "Reinstatement with full back wages",
      "Gratuity payment",
      "Notice pay as per contract",
      "Continuation of benefits",
      "Compensation for discrimination",
    ],
  },
  {
    id: "custom",
    label: "Custom Notice",
    icon: <DescriptionIcon />,
    description: "Create a custom legal notice for any other purpose",
    keyFields: [
      { name: "noticeSubject", label: "Subject of Notice", required: true },
      { name: "background", label: "Background & Facts", required: true, multiline: true },
      { name: "legalBasis", label: "Legal Basis", required: false, multiline: true },
      { name: "demands", label: "Your Demands", required: true, multiline: true },
      { name: "deadline", label: "Deadline to Comply (Days)", required: false },
    ],
    relevantSections: [],
    suggestedContent: [],
  },
];

interface LegalNoticeGeneratorProps {
  token?: string;
}

interface SavedNotice {
  id: string;
  notice_type: string;
  recipient_name: string;
  sender_name: string;
  form_data: string | null;
  generated_content: string | null;
  created_at: string;
}

export default function LegalNoticeGenerator(_props: LegalNoticeGeneratorProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<NoticeType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [generatedNotice, setGeneratedNotice] = useState("");
  const [currentNoticeId, setCurrentNoticeId] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<SavedNotice | null>(null);

  const { data: noticesData, refetch: refetchNotices } = useQuery(GET_LEGAL_NOTICES, {
    skip: !_props.token,
  });

  const [createNotice] = useMutation(CREATE_LEGAL_NOTICE);
  const [deleteNotice] = useMutation(DELETE_LEGAL_NOTICE);

  const savedNotices: SavedNotice[] = noticesData?.getLegalNotices || [];

  const currentTemplate = useMemo(
    () => noticeTemplates.find((t) => t.id === selectedTemplate),
    [selectedTemplate]
  );

  const steps = ["Select Notice Type", "Enter Details", "Review & Generate"];

  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateNoticeContent = () => {
    if (!currentTemplate) return "";

    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const deadline = formData.deadline ? `${formData.deadline} days` : "fifteen (15) days";

    const content = `
<b>LEGAL NOTICE</b>

Date: ${today}

From:
${senderName}
${senderAddress}
Email: ${senderEmail}

To:
${recipientName}
${recipientAddress}

<b>Subject: ${getSubjectLine()}</b>

Dear Sir/Madam,

<b>BACKGROUND:</b>
${getBackgroundSection()}

<b>RELEVANT FACTS:</b>
${getFactsSection()}

${currentTemplate.relevantSections.length > 0 ? `<b>LEGAL POSITION:</b>\n${currentTemplate.relevantSections.map(s => `• ${s}`).join("\n")}\n\n` : ""}
<b>DEMANDS/RELIEF SOUGHT:</b>
${getDemandsSection()}

<b>NOTICE:</b>
Take notice that you are hereby called upon to comply with the aforementioned demands within ${deadline} from the date of receipt of this notice. In case of your failure or neglect to comply with the same, the sender shall be constrained to initiate appropriate legal proceedings against you without further notice, and you shall be solely liable for the consequences thereof, including all costs, charges, and expenses incurred by the sender.

This notice is issued without prejudice to the rights and remedies available to the sender in law and equity.

Be pleased to govern yourselves accordingly.

Yours faithfully,

___________________
${senderName}
(Authorized Signatory)

Place: ${senderAddress.split(",").pop()?.trim() || "[City]"}
Date: ${today}
    `.trim();

    return content;
  };

  const getSubjectLine = () => {
    switch (selectedTemplate) {
      case "salary_recovery":
        return `Demand for Payment of Outstanding Salary and Other Employment Dues`;
      case "property_dispute":
        return `Legal Notice Regarding Property Dispute at ${formData.propertyAddress || "[Property Address]"}`;
      case "defamation":
        return `Legal Notice for Defamation and Demand for Apology`;
      case "harassment":
        return `Legal Notice Regarding Workplace Harassment`;
      case "breach_contract":
        return `Legal Notice for Breach of ${formData.contractType || "Contract"} Agreement`;
      case "eviction":
        return `Legal Notice for Eviction from Property at ${formData.propertyAddress || "[Property Address]"}`;
      case "cheque_bounce":
        return `Legal Notice Under Section 138 of NI Act for Dishonored Cheque No. ${formData.chequeNumber || "[Cheque No.]"}`;
      case "consumer_complaint":
        return `Legal Notice for Deficiency in Service - ${formData.serviceDescription || "[Service/Product]"}`;
      case "employment_dispute":
        return `Legal Notice Regarding Employment Dispute`;
      default:
        return `Legal Notice - ${formData.noticeSubject || "[Subject]"}`;
    }
  };

  const getBackgroundSection = () => {
    switch (selectedTemplate) {
      case "salary_recovery":
        return `That the Sender was employed with the Receiver as ${formData.designation || "[Designation]"} w.e.f. ${formData.joiningDate || "[Date]"}. The Sender's last working day was ${formData.lastWorkingDay || "[Date]"}. Despite completion of employment, the Receiver has failed to pay the Sender's salary amounting to Rs. ${formData.salaryAmount || "[Amount]"} for ${formData.monthsDue || "[Number]"} months, along with other dues of Rs. ${formData.additionalDues || "NIL"}.`;
      case "property_dispute":
        return `That the Sender has a legitimate claim and right over the property situated at ${formData.propertyAddress || "[Address]"} (${formData.propertyType || "Property"}). The nature of dispute is ${formData.disputeNature || "[Describe]"}. ${formData.documentRef ? `Reference: ${formData.documentRef}.` : ""}`;
      case "defamation":
        return `That on or about ${formData.statementDate || "[Date]"}, the Receiver made certain false and defamatory statements against the Sender via ${formData.statementMedium || "medium"}. The statement "${formData.defamatoryStatement || "[Statement]"}" has caused immense damage to the Sender's reputation and goodwill.`;
      case "harassment":
        return `That the Sender has been subjected to harassment by ${formData.perpetratorName || "[Name]"} on multiple occasions. The incidents occurred on ${formData.incidentDates || "[Dates]"}. ${formData.witnessNames ? `The incidents were witnessed by: ${formData.witnessNames}.` : ""} The harassment has caused severe mental anguish and affected the Sender's work performance.`;
      case "cheque_bounce":
        return `That the Sender is the lawful holder of Cheque No. ${formData.chequeNumber || "[Number]"} dated ${formData.chequeDate || "[Date]"} drawn on ${formData.bankName || "[Bank]"} for an amount of Rs. ${formData.chequeAmount || "[Amount]"}. The said cheque was dishonored on ${formData.dishonourDate || "[Date]"} with the reason: ${formData.reasonForDishonour || "[Reason]"}.`;
      default:
        return formData.background || "[Background details to be provided]";
    }
  };

  const getFactsSection = () => {
    if (currentTemplate?.id === "custom") {
      return formData.background || "[Facts to be provided]";
    }
    
    const facts: string[] = [];
    
    if (selectedTemplate === "salary_recovery") {
      facts.push(`• Employment Period: ${formData.joiningDate} to ${formData.lastWorkingDay}`);
      facts.push(`• Designation: ${formData.designation}`);
      facts.push(`• Pending Salary: Rs. ${formData.salaryAmount} for ${formData.monthsDue} months`);
      if (formData.additionalDues) {
        facts.push(`• Additional Dues: Rs. ${formData.additionalDues}`);
      }
    } else if (selectedTemplate === "cheque_bounce") {
      facts.push(`• Cheque Number: ${formData.chequeNumber}`);
      facts.push(`• Cheque Date: ${formData.chequeDate}`);
      facts.push(`• Amount: Rs. ${formData.chequeAmount}`);
      facts.push(`• Bank: ${formData.bankName}`);
      facts.push(`• Dishonour Date: ${formData.dishonourDate}`);
      facts.push(`• Reason: ${formData.reasonForDishonour}`);
    } else if (selectedTemplate === "consumer_complaint") {
      facts.push(`• Service/Product: ${formData.serviceDescription}`);
      facts.push(`• Purchase Date: ${formData.purchaseDate}`);
      facts.push(`• Amount Paid: Rs. ${formData.amountPaid}`);
      facts.push(`• Deficiency: ${formData.deficiencyDescription}`);
    } else if (selectedTemplate === "property_dispute") {
      facts.push(`• Property: ${formData.propertyType} at ${formData.propertyAddress}`);
      facts.push(`• Nature of Dispute: ${formData.disputeNature}`);
      facts.push(`• Claimed Rights: ${formData.claimedRights}`);
    } else {
      facts.push(`• Details: ${Object.values(formData).filter(v => v).join("; ")}`);
    }
    
    return facts.join("\n");
  };

  const getDemandsSection = () => {
    if (currentTemplate?.id === "custom") {
      return formData.demands || "[Demands to be specified]";
    }

    const demands: string[] = [];
    demands.push("The Sender demands the following relief:");
    
    if (selectedTemplate === "salary_recovery") {
      demands.push(`1. Payment of pending salary: Rs. ${formData.salaryAmount}`);
      if (formData.additionalDues) {
        demands.push(`2. Payment of additional dues: Rs. ${formData.additionalDues}`);
      }
      demands.push("3. Interest @ 18% p.a. on delayed payment");
      demands.push("4. Full and Final Settlement Certificate");
      demands.push("5. Experience/Service Letter");
      demands.push("6. Costs of this notice and legal proceedings");
    } else if (selectedTemplate === "cheque_bounce") {
      demands.push(`1. Payment of cheque amount: Rs. ${formData.chequeAmount}`);
      demands.push("2. Interest @ 18% p.a. from date of cheque");
      demands.push("3. Compensation of Rs. 2,000/- under Section 142 of NI Act");
      demands.push("4. Costs of this notice");
      demands.push("5. Undertaking to refrain from issuing worthless cheques");
    } else if (selectedTemplate === "consumer_complaint") {
      demands.push(`1. Refund of amount paid: Rs. ${formData.amountPaid}`);
      if (formData.refundSought) {
        demands.push(`2. Compensation: Rs. ${formData.refundSought}`);
      }
      demands.push("3. Replacement of defective product/service");
      demands.push("4. Costs of this notice");
    } else if (selectedTemplate === "property_dispute") {
      demands.push("1. Immediate recognition of Sender's rights over the property");
      demands.push("2. Vacant possession of the property");
      demands.push("3. Mesne profits for unauthorized occupation");
      demands.push("4. Restoration of amenities");
      demands.push("5. Costs and damages");
    } else {
      currentTemplate?.suggestedContent.forEach((content, idx) => {
        demands.push(`${idx + 1}. ${content}`);
      });
    }

    return demands.join("\n");
  };

  const handleGenerate = async () => {
    const content = generateNoticeContent();
    setGeneratedNotice(content);
    setActiveStep(2);

    try {
      const result = await createNotice({
        variables: {
          input: {
            notice_type: selectedTemplate || "custom",
            recipient_name: recipientName,
            recipient_address: recipientAddress,
            sender_name: senderName,
            sender_address: senderAddress,
            sender_email: senderEmail,
            form_data: JSON.stringify(formData),
            generated_content: content,
          },
        },
      });
      if (result.data?.createLegalNotice) {
        setCurrentNoticeId(result.data.createLegalNotice.id);
        toast.success("Notice saved to history!");
        refetchNotices();
      }
    } catch (error) {
      console.error("Failed to save notice:", error);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("notice-content");
    if (!element) return;

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
      filename: `Legal_Notice_${selectedTemplate}_${Date.now()}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleCopyToClipboard = () => {
    const textContent = generatedNotice.replace(/<[^>]*>/g, "");
    navigator.clipboard.writeText(textContent);
    toast.success("Copied to clipboard!");
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(getSubjectLine());
    const body = encodeURIComponent(generatedNotice.replace(/<[^>]*>/g, "\n").replace(/&nbsp;/g, " ").trim());
    const recipient = encodeURIComponent(recipientName);
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    toast.info("Opening email client...");
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedTemplate(null);
    setFormData({});
    setRecipientName("");
    setRecipientAddress("");
    setSenderName("");
    setSenderAddress("");
    setSenderEmail("");
    setGeneratedNotice("");
    setCurrentNoticeId(null);
  };

  const handleDeleteNotice = async () => {
    if (!noticeToDelete) return;
    try {
      await deleteNotice({
        variables: { noticeId: noticeToDelete.id },
      });
      toast.success("Notice deleted successfully!");
      refetchNotices();
    } catch (error) {
      toast.error("Failed to delete notice");
    }
    setDeleteDialogOpen(false);
    setNoticeToDelete(null);
  };

  const loadNoticeFromHistory = (notice: SavedNotice) => {
    setSelectedTemplate(notice.notice_type as NoticeType);
    setRecipientName(notice.recipient_name);
    setSenderName(notice.sender_name);
    if (notice.form_data) {
      try {
        const parsed = JSON.parse(notice.form_data);
        setFormData(parsed);
      } catch {
        setFormData({});
      }
    }
    if (notice.generated_content) {
      setGeneratedNotice(notice.generated_content);
    }
    setCurrentNoticeId(notice.id);
    setActiveStep(2);
    setHistoryDialogOpen(false);
    toast.info("Notice loaded from history");
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select the type of Legal Notice you want to generate
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose from our comprehensive templates designed for Indian legal requirements
            </Typography>
            <Grid container spacing={2}>
              {noticeTemplates.map((template) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                  <Paper
                    elevation={selectedTemplate === template.id ? 4 : 1}
                    onClick={() => setSelectedTemplate(template.id)}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      border: selectedTemplate === template.id ? "2px solid #1a237e" : "2px solid transparent",
                      transition: "all 0.2s",
                      "&:hover": {
                        border: "2px solid #1a237e",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box sx={{ color: "#1a237e" }}>{template.icon}</Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {template.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {template.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Enter Notice Details
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="primary" gutterBottom>
              Sender Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Your Full Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Your Address"
                  multiline
                  rows={2}
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="primary" gutterBottom>
              Recipient Details
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Recipient Name / Company Name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Recipient Address"
                  multiline
                  rows={2}
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  required
                />
              </Grid>
            </Grid>

            {currentTemplate && (
              <>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  {currentTemplate.label} Details
                </Typography>
                <Grid container spacing={2}>
                  {currentTemplate.keyFields.map((field) => (
                    <Grid
                      size={{
                        xs: 12,
                        md: field.name.includes("Description") || field.multiline ? 12 : 6,
                      }}
                      key={field.name}
                    >
                      <TextField
                        fullWidth
                        label={field.label}
                        multiline={field.multiline}
                        rows={field.multiline ? 3 : 1}
                        value={formData[field.name] || ""}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        required={field.required}
                        type={field.name.includes("Amount") || field.name.includes("Paid") || field.name.includes("Rent") ? "number" : "text"}
                      />
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">Generated Legal Notice</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CopyIcon />}
                  onClick={handleCopyToClipboard}
                >
                  Copy
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadPDF}
                >
                  PDF
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<EmailIcon />}
                  onClick={handleSendEmail}
                  sx={{ bgcolor: "#1a237e" }}
                >
                  Email
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> This is a draft notice. Please review and consult with a legal professional 
                before sending. This notice is generated for informational purposes only.
              </Typography>
            </Alert>

            <Paper
              id="notice-content"
              elevation={2}
              sx={{
                p: 4,
                bgcolor: "white",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
                "& b": { fontWeight: "bold" },
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: generatedNotice.replace(/\n/g, "<br/>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") }} />
            </Paper>

            {currentTemplate?.relevantSections && currentTemplate.relevantSections.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Relevant Legal Sections
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {currentTemplate.relevantSections.map((section, idx) => (
                    <Chip key={idx} label={section} size="small" sx={{ bgcolor: "#E8EAF6" }} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    if (activeStep === 0) return !!selectedTemplate;
    if (activeStep === 1) {
      if (!senderName || !recipientName || !recipientAddress) return false;
      if (currentTemplate?.keyFields.some((f) => f.required && !formData[f.name])) return false;
      return true;
    }
    return true;
  };

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: "#1a237e" }}>
          Legal Notice Generator
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<HistoryIcon />}
          onClick={() => setHistoryDialogOpen(true)}
        >
          History ({savedNotices.length})
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Generate professional legal notices for various purposes under Indian law
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={0} sx={{ p: 3, bgcolor: "#fafafa", borderRadius: 2, mb: 3 }}>
        {renderStepContent()}
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box>
          {activeStep > 0 && (
            <Button onClick={() => setActiveStep((prev) => prev - 1)}>
              Back
            </Button>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          {activeStep < 2 && (
            <Button variant="outlined" onClick={handleReset} startIcon={<RefreshIcon />}>
              Reset
            </Button>
          )}
          {activeStep < 2 ? (
            <Button
              variant="contained"
              onClick={() => {
                if (activeStep === 1) {
                  handleGenerate();
                } else {
                  setActiveStep((prev) => prev + 1);
                }
              }}
              disabled={!isStepValid()}
              sx={{ bgcolor: "#1a237e" }}
            >
              {activeStep === 0 ? "Continue" : "Generate Notice"}
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={handleDownloadPDF}
                startIcon={<DownloadIcon />}
                sx={{ bgcolor: "white" }}
              >
                Download PDF
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RefreshIcon />}
              >
                Create New
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Saved Legal Notices</DialogTitle>
        <DialogContent>
          {savedNotices.length === 0 ? (
            <Typography color="text.secondary">No saved notices yet.</Typography>
          ) : (
            <List>
              {savedNotices.map((notice) => (
                <ListItem
                  key={notice.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setNoticeToDelete(notice);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={notice.notice_type.replace(/_/g, " ").toUpperCase()}
                    secondary={`To: ${notice.recipient_name} | ${new Date(notice.created_at).toLocaleDateString()}`}
                    onClick={() => loadNoticeFromHistory(notice)}
                    sx={{ cursor: "pointer", "&:hover": { bgcolor: "#f5f5f5" } }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Notice</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this notice? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteNotice} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
