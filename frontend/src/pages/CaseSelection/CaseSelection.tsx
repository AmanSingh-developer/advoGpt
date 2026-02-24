import { Typography, Card } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useCaseStyles } from "./CaseSelection.Style";

const CASE_TYPES = [
  "Employment Issue",
  "FIR / Police",
  "Property Dispute",
  "Family Matter",
  "Money Recovery",
  "Other",
];

export default function CaseSelection() {
  const classes = useCaseStyles();
  const navigate = useNavigate();

  const selectCase = (type: string) => {
    localStorage.setItem("caseType", type);
    navigate("/chat");
  };

  return (
    <div className={classes.container}>
      <Typography variant="h4" className={classes.title}>
        Select Your Case Type
      </Typography>

      <div className={classes.grid}>
        {CASE_TYPES.map((type) => (
          <Card
            key={type}
            className={classes.card}
            onClick={() => selectCase(type)}
          >
            {type}
          </Card>
        ))}
      </div>
    </div>
  );
}