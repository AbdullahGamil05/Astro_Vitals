import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { LiveDataProvider } from "./lib/liveData";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <LiveDataProvider>
        <App />
      </LiveDataProvider>
    </AuthProvider>
  </StrictMode>,
);
