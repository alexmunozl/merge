import React from "react";
import { Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import HealthPage from "./pages/HealthPage";
import ApiExplorerPage from "./pages/ApiExplorerPage";
import ProfilesPage from "./pages/ProfilesPage";
import MergesPage from "./pages/MergesPage";
import PollingPage from "./pages/PollingPage";
import ReviewsPage from "./pages/ReviewsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/profiles" element={<ProfilesPage />} />
      <Route path="/merges" element={<MergesPage />} />
      <Route path="/polling" element={<PollingPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="/health" element={<HealthPage />} />
      <Route path="/api" element={<ApiExplorerPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<DashboardPage />} />
    </Routes>
  );
}
