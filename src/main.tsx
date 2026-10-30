import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully handle benign HMR WebSocket reconnection errors in the sandboxed preview
if (typeof window !== "undefined") {
  const isBenignWebsocketError = (msg: string) => {
    return msg && (
      msg.includes("WebSocket") || 
      msg.includes("websocket") || 
      msg.includes("failed to connect to websocket") ||
      msg.includes("WebSocket closed without opened")
    );
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason?.message || String(event.reason);
    if (isBenignWebsocketError(reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (isBenignWebsocketError(msg) || (event.error && isBenignWebsocketError(event.error.message))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

