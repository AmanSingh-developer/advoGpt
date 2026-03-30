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

const SIGNUP_MUTATION = gql`
  mutation Signup($email: String!, $password: String!, $firstName: String!, $lastName: String!) {
    signup(input: { email: $email, password: $password, firstName: $firstName, lastName: $lastName }) {
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

interface SignupResponse {
  signup: {
    token: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

export default function Register() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [signupMutation, { loading }] = useMutation<SignupResponse>(SIGNUP_MUTATION);

  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError("");

    try {
      const { data } = await signupMutation({
        variables: { firstName, lastName, email, password },
      });

      if (data?.signup?.token) {
        const user = {
          id: data.signup.user.id,
          email: data.signup.user.email,
          firstName: data.signup.user.firstName,
          lastName: data.signup.user.lastName,
        };
        authLogin(data.signup.token, user);
        navigate("/select-case");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignup();
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
            Join AI Legal Intelligence Platform
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            label="First Name"
            fullWidth
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <TextField
            label="Last Name"
            fullWidth
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyPress={handleKeyPress}
          />
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
          autoComplete="new-password"
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
          onClick={handleSignup}
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
          {loading ? <CircularProgress size={24} color="inherit" /> : "Create Account"}
        </Button>

        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          Already have an account?{" "}
          <Link
            component="button"
            onClick={() => navigate("/")}
            sx={{ fontWeight: 600, color: "#1a237e" }}
          >
            Sign in
          </Link>
        </Typography>
      </Card>
    </Box>
  );
}
