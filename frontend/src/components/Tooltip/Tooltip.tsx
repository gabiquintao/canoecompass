import styles from "./Tooltip.module.css";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

interface Props {
    content: ReactNode;
    ariaLabel?: string;
}

export function InfoTooltip({ content, ariaLabel = "More information" }: Props) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ left: 0, top: 0 });
    const ref = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setCoords({
                left: rect.right + 8,
                top: rect.top - 6,
            });
            setOpen(true);
        }
    };

    const handleMouseLeave = () => {
        setOpen(false);
    };

    return (
        <span
            ref={ref}
            className={styles.wrapper}
            aria-label={ariaLabel}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <span className={styles.symbol} role="img" aria-hidden="true">
                <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path
                        d="M8 7V11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <circle cx="8" cy="4.5" r="1" fill="currentColor" />
                </svg>
            </span>
            {open &&
                createPortal(
                    <div
                        className={styles.card}
                        role="tooltip"
                        style={{ left: `${coords.left}px`, top: `${coords.top}px` }}
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </span>
    );
}
