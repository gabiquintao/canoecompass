import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./DocsApp.module.css";

const SIDEBAR_SECTIONS = [
    {
        title: "Overview",
        links: [
            { id: "overview", label: "Introduction" },
            { id: "architecture", label: "Architecture" },
            { id: "stack", label: "Technology Stack" },
        ]
    },
    {
        title: "Backend",
        links: [
            { id: "backend-entry", label: "Entry Point" },
            { id: "database", label: "Database" },
            { id: "schemas", label: "Schemas" },
            { id: "navigability", label: "Navigability" },
            { id: "marine", label: "Marine" },
            { id: "calibration", label: "Calibration" },
            { id: "fetcher", label: "Fetcher" },
            { id: "auth-backend", label: "Auth" },
            { id: "helpers", label: "Helpers & Utils" },
            { id: "backfill", label: "Backfill" },
        ]
    },
    {
        title: "API Reference",
        links: [
            { id: "api-public", label: "Public Endpoints" },
            { id: "api-auth", label: "Authenticated Endpoints" },
            { id: "rate-limits", label: "Rate Limiting" },
        ]
    },
    {
        title: "Frontend",
        links: [
            { id: "frontend-entry", label: "Entry & Bootstrap" },
            { id: "state", label: "State Architecture" },
            { id: "hooks", label: "Hooks" },
            { id: "components", label: "Components" },
            { id: "api-client", label: "API Client" },
            { id: "scoring-ui", label: "Scoring in the UI" },
        ]
    },
    {
        title: "Data Flow",
        links: [
            { id: "data-lifecycle", label: "Data Lifecycle" },
            { id: "scoring-logic", label: "Scoring Logic" },
        ]
    },
    {
        title: "Deployment",
        links: [
            { id: "env", label: "Environment Variables" },
            { id: "docker", label: "Docker" },
            { id: "running", label: "Running Locally" },
        ]
    }
];

export function DocsSidebar() {
    const navigate = useNavigate();
    const [activeId, setActiveId] = useState<string>("");
    const activeIdRef = useRef(activeId);
    activeIdRef.current = activeId;

    useEffect(() => {
        const wrapper = document.getElementById('docs-content-wrapper');
        if (!wrapper) return;

        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const wrapperRect = wrapper.getBoundingClientRect();
                    // trigger line is 100px from the top of the container
                    const triggerY = wrapperRect.top + 100; 
                    
                    let bestId = "";
                    SIDEBAR_SECTIONS.forEach(section => {
                        section.links.forEach(link => {
                            const el = document.getElementById(link.id);
                            if (el) {
                                const rect = el.getBoundingClientRect();
                                if (rect.top <= triggerY) {
                                    bestId = link.id;
                                }
                            }
                        });
                    });

                    if (!bestId && SIDEBAR_SECTIONS[0].links.length > 0) {
                        bestId = SIDEBAR_SECTIONS[0].links[0].id;
                    }

                    if (bestId && bestId !== activeIdRef.current) {
                        setActiveId(bestId);
                        
                        // Manually auto-scroll the sidebar container to avoid page-level scroll layout shifts
                        const sidebarWrapper = document.getElementById('docs-sidebar-wrapper');
                        const navLinkEl = document.getElementById(`nav-link-${bestId}`);
                        
                        if (sidebarWrapper && navLinkEl) {
                            const wrapperRect = sidebarWrapper.getBoundingClientRect();
                            const linkRect = navLinkEl.getBoundingClientRect();
                            
                            // 32px padding offset to match the CSS padding-top
                            if (linkRect.bottom > wrapperRect.bottom) {
                                sidebarWrapper.scrollTop += (linkRect.bottom - wrapperRect.bottom + 32);
                            } else if (linkRect.top < wrapperRect.top + 32) {
                                sidebarWrapper.scrollTop -= (wrapperRect.top + 32 - linkRect.top);
                            }
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        };

        wrapper.addEventListener('scroll', handleScroll, { passive: true });
        // Run once on mount to set initial active section
        handleScroll();

        return () => wrapper.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={styles.sidebarNav}>
            {SIDEBAR_SECTIONS.map((section, idx) => (
                <div key={section.title}>
                    <div 
                        className="nav-section-label" 
                        style={idx === 0 ? { marginTop: 0, paddingTop: 0 } : undefined}
                    >
                        {section.title}
                    </div>
                    {section.links.map(link => {
                        const isActive = activeId === link.id;
                        return (
                            <a
                                key={link.id}
                                id={`nav-link-${link.id}`}
                                href={`/docs#${link.id}`}
                                className={isActive ? "active" : ""}
                                onClick={(e) => {
                                    e.preventDefault();
                                    const target = document.getElementById(link.id);
                                    const wrapper = document.getElementById('docs-content-wrapper');
                                    if (target && wrapper) {
                                        // Update URL hash without jumping
                                        window.history.pushState(null, "", `/docs#${link.id}`);
                                        
                                        // Calculate exact position to scroll to
                                        const wrapperRect = wrapper.getBoundingClientRect();
                                        const targetRect = target.getBoundingClientRect();
                                        const offset = targetRect.top - wrapperRect.top + wrapper.scrollTop;
                                        
                                        wrapper.scrollTo({
                                            top: offset - 48, // 48px offset for breathing room
                                            behavior: 'smooth'
                                        });
                                        
                                        setActiveId(link.id);
                                    }
                                }}
                            >
                                {link.label}
                            </a>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
