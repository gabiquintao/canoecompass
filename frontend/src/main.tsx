import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

/*
 * iOS Safari: 100dvh doesn't shrink when the on-screen keyboard opens, which
 * can leave content sized for more space than is actually visible. Track the
 * real visible height via the visualViewport API and expose it as --vvh so
 * layout can size against it instead.
 */
function syncVisualViewport() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty("--vvh", `${height}px`);
}

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncVisualViewport);
}
window.addEventListener("resize", syncVisualViewport);
syncVisualViewport();

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
