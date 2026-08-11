import { Routes, Route } from "react-router-dom";
import { MapApp } from "./MapApp";
import { DocsApp } from "./pages/Docs/DocsApp";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<MapApp />} />
            <Route path="/docs/*" element={<DocsApp />} />
        </Routes>
    );
}
