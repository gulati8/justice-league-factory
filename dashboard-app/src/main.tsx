import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./theme.css";
import { Layout } from "./components/Layout";
import { RunSummary } from "./views/RunSummary";
import { RunTrace } from "./views/RunTrace";
import { Analytics } from "./views/Analytics";
import { LogView } from "./views/LogView";
import { TranscriptView } from "./views/TranscriptView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<RunSummary />} />
          <Route path="runs/:runId" element={<RunTrace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="logs" element={<LogView />} />
          <Route path="transcript/:agentRunId" element={<TranscriptView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
