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
  Alert,
  Avatar,
} from "@mui/material";
import { Visibility, VisibilityOff, Gavel } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "../../context/AuthContext";

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

interface LoginResponse {
  login: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [loginMutation, { loading }] = useMutation<LoginResponse>(LOGIN_MUTATION);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");

    try {
      const { data } = await loginMutation({
        variables: { email, password },
      });

      if (data?.login?.token) {
        const user = {
          id: data.login.user.id,
          email: data.login.user.email,
          firstName: data.login.user.firstName,
          lastName: data.login.user.lastName,
        };
        authLogin(data.login.token, user);
        navigate("/select-case");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f0f2f5",
        p: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40vh",
          bgcolor: "#1a237e",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
        }}
      />

      <Card
        sx={{
          p: 4,
          maxWidth: 420,
          width: "100%",
          borderRadius: 3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: "auto",
              mb: 2,
              bgcolor: "#1a237e",
            }}
          >
            <Gavel sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700} sx={{ color: "#1a237e" }}>
            LegalGPT
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to analyze and strengthen your legal case
          </Typography>
        </Box>

        <TextField
          label="Email"
          fullWidth
          sx={{ mb: 2 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          autoComplete="email"
        />

        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          fullWidth
          sx={{ mb: 2 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          disabled={loading}
          sx={{
            py: 1.5,
            bgcolor: "#1a237e",
            "&:hover": { bgcolor: "#283593" },
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
        </Button>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          Don't have an account?{" "}
          <Link
            component="button"
            onClick={() => navigate("/signup")}
            sx={{ fontWeight: 600, color: "#1a237e" }}
          >
            Sign up
          </Link>
        </Typography>
      </Card>
    </Box>
  );
}
