import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { SpaceBackground } from "./components/SpaceBackground";
import { AuthProvider } from "./lib/auth";
import { LiveDataProvider } from "./lib/liveData";
import { ToastProvider } from "./lib/toast";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SpaceBackground />
    <AuthProvider>
      <LiveDataProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LiveDataProvider>
    </AuthProvider>
  </StrictMode>,
);
