import {
  Card,
  TextField,
  Button,
  Typography,
  Link,
  Box,
  IconButton,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useLoginStyles } from "./Login.Style";
import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function Login() {
  const classes = useLoginStyles();
  const navigate = useNavigate();

  const GET_HELLO = gql`
  query {
    hello
  }
`;

const { data, loading: l, error: r } = useQuery(GET_HELLO);

console.log(data);


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    setLoading(true);

    // Simulate API
    setTimeout(() => {
      setLoading(false);
      navigate("/select-case");
    }, 1500);
  };

  return (
    <Box className={classes.root}>
      <Card className={classes.card}>
        <Typography className={classes.title}>
          AI Legal Intelligence
        </Typography>

        <Typography className={classes.subtitle}>
          Sign in to analyze and strengthen your legal case.
        </Typography>

        <TextField
          label="Email"
          fullWidth
          className={classes.field}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          fullWidth
          className={classes.field}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <Typography className={classes.errorText}>
            {error}
          </Typography>
        )}

        <Button
          variant="contained"
          fullWidth
          className={classes.button}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Continue"}
        </Button>

        <Typography className={classes.footerText}>
          Don’t have an account?{" "}
          <Link
            component="button"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </Link>
        </Typography>
      </Card>
    </Box>
  );
}