import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import mermaid from "mermaid";
import { TopBar } from "../../components/TopBar/TopBar";
import styles from "./DocsApp.module.css";
import { DocsSidebar } from "./DocsSidebar";
import { DocsContent } from "./DocsContent";

export function DocsApp() {
    const location = useLocation();

    useEffect(() => {
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        mermaid.run({ querySelector: ".mermaid" }).catch(console.error);
    }, []);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.substring(1);
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [location.hash]);

    const [isDark, setIsDark] = useState(() => {
        return document.documentElement.getAttribute("data-theme") === "dark";
    });

    const handleToggleTheme = () => {
        const next = !isDark;
        setIsDark(next);
        document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    };

    return (
        <div className={styles.layout}>
            <TopBar
                loading={false}
                error={null}
                stationCount={0}
                lastUpdated={null}
                onRefetch={() => {}}
                isPanelOpen={false}
                onTogglePanel={() => {}}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                onOpenAccount={() => {}}
                compact={true}
            />
            <main className={styles.main}>
                <div className={styles.container}>
                    <aside id="docs-sidebar-wrapper" className={styles.sidebar}>
                        <DocsSidebar />
                    </aside>

                    <section id="docs-content-wrapper" className={styles.contentWrapper}>
                        <div className={styles.content}>
                            <DocsContent />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
