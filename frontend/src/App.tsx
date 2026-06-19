import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UploadPage from "@/pages/UploadPage";
import DashboardPage from "@/pages/DashboardPage";
import Navbar from "@/components/Navbar";
import IntroLoader from "@/components/IntroLoader";
import { STORAGE_KEYS } from "@/lib/brand";

export default function App() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const seen =
      sessionStorage.getItem(STORAGE_KEYS.introSeen)
      ?? sessionStorage.getItem(STORAGE_KEYS.introSeenLegacy);
    if (!seen) {
      setShowIntro(true);
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem(STORAGE_KEYS.introSeen, "1");
    sessionStorage.removeItem(STORAGE_KEYS.introSeenLegacy);
    setShowIntro(false);
  };

  return (
    <Router>
      {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
      <div className="no-print">
        <Navbar />
      </div>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}
