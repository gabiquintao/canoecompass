import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

function syncVisualViewport() {
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty("--vvh", `${height}px`);
    window.scrollTo(0, 0);
    if (vv) {
        document.documentElement.style.setProperty("--vv-offset-top", `${vv.offsetTop}px`);
    }
}

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncVisualViewport);
    window.visualViewport.addEventListener("scroll", syncVisualViewport);
}
window.addEventListener("resize", syncVisualViewport);
syncVisualViewport();

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
