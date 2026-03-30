import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/SignIn/singIn";
import Login from "./pages/Login/Login";
import CaseSelection from "./pages/CaseSelection/CaseSelection";
import Chat from "./pages/Chat/Chat";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route
          path="/select-case"
          element={
            <ProtectedRoute>
              <CaseSelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
