import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/SignIn/singIn";
import Login from "./pages/Login/Login";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
      <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Register />} />
      </Routes>
    </BrowserRouter>
  )
};

export default AppRouter;