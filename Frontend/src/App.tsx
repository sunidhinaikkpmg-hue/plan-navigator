import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { Header } from "./features/layout/Header";
import { Sidebar } from "./features/layout/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { PlanCheckUp } from "./pages/PlanCheckUp";
import { PlanHealthTests } from "./pages/PlanHealthTests";
import { OperationsTests } from "./pages/OperationsTests";
import { Recommendations } from "./pages/Recommendations";
import { ParticipantEducation } from "./pages/ParticipantEducation";
import { Documents } from "./pages/Documents";
import { WhatIfSimulator } from "./pages/WhatIfSimulator";
import { RetirementAI } from "./pages/RetirementAI";
import { Usage } from "./pages/Usage";
import { DataSchema } from "./pages/DataSchema";
import "./App.css";

function ProtectedLayout() {
  return (
    <div className="app-container">
      <Header />
      <div className="app-shell">
        <Sidebar />
        <main className="app-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="plan-checkup" element={<PlanCheckUp />} />
            <Route path="plan-health-tests" element={<PlanHealthTests />} />
            <Route path="operations-tests" element={<OperationsTests />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="participant-education" element={<ParticipantEducation />} />
            <Route path="documents" element={<Documents />} />
            <Route path="what-if-simulator" element={<WhatIfSimulator />} />
            <Route path="retirement-ai" element={<RetirementAI />} />
            <Route path="usage" element={<Usage />} />
            <Route path="data-schema" element={<DataSchema />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoute />}> 
            <Route path="*" element={<ProtectedLayout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

