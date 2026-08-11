import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { TopBar } from "../../components/TopBar/TopBar";
import styles from "./DocsApp.module.css";
import { DocsSidebar } from "./DocsSidebar";
import { DocsContent } from "./DocsContent";

export function DocsApp() {
    const location = useLocation();

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

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
                    {/* Mobile Menu Toggle */}
                    <div className={styles.mobileNav}>
                        <button 
                            className={styles.menuBtn} 
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open Table of Contents"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                            <span>Table of Contents</span>
                        </button>
                    </div>

                    {/* Mobile Backdrop */}
                    {isSidebarOpen && (
                        <div 
                            className={styles.sidebarBackdrop} 
                            onClick={() => setIsSidebarOpen(false)} 
                        />
                    )}

                    <aside 
                        id="docs-sidebar-wrapper" 
                        className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
                    >
                        <DocsSidebar onLinkClick={() => setIsSidebarOpen(false)} />
                    </aside>

                    <section id="docs-content-wrapper" className={styles.contentWrapper}>
                        <div className={styles.content}>
                            <DocsContent isDark={isDark} />
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
