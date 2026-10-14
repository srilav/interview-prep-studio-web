import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { LearnerProvider } from "./lib/learner";
import "./styles/global.css";
import "./styles/studio.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LearnerProvider>
        <App />
      </LearnerProvider>
    </BrowserRouter>
  </StrictMode>,
);
