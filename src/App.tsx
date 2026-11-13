import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/layouts/AppShell";
import { homePathFor, useAuth } from "@/lib/auth";
import { LoginPage } from "@/pages/LoginPage";
import { AstronautHomePage } from "@/pages/astronaut/HomePage";
import { DirectoryPage } from "@/pages/medical/DirectoryPage";
import { MedicalOverviewPage } from "@/pages/medical/OverviewPage";
import { MedicalAstronautDetailPage, ProfilesPage } from "@/pages/medical/ProfilesPage";
import {
  AiAnalysisPage,
  AssessmentPage,
  HistoryPage,
  LeaderboardPage,
  MedicalAlertsPage,
  MonitoringPage,
  OwnProfilePage,
  ReportsPage,
} from "@/pages/placeholders";

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homePathFor(user.role) : "/login"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute role="astronaut" />}>
          <Route path="/astronaut" element={<AppShell />}>
            <Route index element={<AstronautHomePage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="ai-analysis" element={<AiAnalysisPage />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile" element={<OwnProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="medical" />}>
          <Route path="/medical" element={<AppShell />}>
            <Route index element={<MedicalOverviewPage />} />
            <Route path="directory" element={<DirectoryPage />} />
            <Route path="profiles" element={<ProfilesPage />} />
            <Route path="astronauts/:id" element={<MedicalAstronautDetailPage />} />
            <Route path="alerts" element={<MedicalAlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
