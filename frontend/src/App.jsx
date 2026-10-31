import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home/Home";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ResourceDetail from "./pages/Resources/ResourceDetail";
import UploadResource from "./pages/Resources/UploadResource";
import EditResource from "./pages/Resources/EditResource";
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";
import "./App.css";

function App() {
  return (
    <div className="app-root">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/resources/:id" element={<ResourceDetail />} />
          <Route path="/upload" element={<UploadResource />} />
          <Route path="/resources/:id/edit" element={<EditResource />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
