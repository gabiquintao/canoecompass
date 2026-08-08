import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTimezone } from "../../hooks/useTimezone";
import { supabase } from "../../supabase";
import styles from "./AccountModal.module.css";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: Props) {
    const { user, signOut } = useAuth();
    const { timezone, setTimezone } = useTimezone();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMsg(null);

        try {
            if (isRegistering) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMsg("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err: unknown) {
            setError((err as Error).message || "An error occurred");
        }
    };

    // List of common IANA timezones (could be expanded)
    const timezones = [
        "UTC",
        "Europe/Lisbon",
        "Europe/London",
        "Europe/Madrid",
        "America/New_York",
        "America/Los_Angeles",
        "America/Sao_Paulo",
        "Asia/Tokyo",
        "Australia/Sydney",
    ];
    if (!timezones.includes(timezone)) {
        timezones.push(timezone);
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>Settings & Account</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </header>

                <div className={styles.content}>
                    <section className={styles.section}>
                        <h3>Preferences</h3>
                        <label className={styles.label}>
                            <span>Timezone</span>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className={styles.select}
                            >
                                {timezones.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz.replace("_", " ")}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <p className={styles.helpText}>
                            Controls how forecast times are displayed.
                            {user ? " Saved to your account." : " Log in to sync across devices."}
                        </p>
                    </section>

                    <hr className={styles.divider} />

                    <section className={styles.section}>
                        <h3>Account</h3>
                        {user ? (
                            <div className={styles.loggedIn}>
                                <p>
                                    Signed in as <strong>{user.email}</strong>
                                </p>
                                <button className={styles.btnSecondary} onClick={signOut}>
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <form className={styles.form} onSubmit={handleAuth}>
                                {error && <div className={styles.error}>{error}</div>}
                                {msg && <div className={styles.success}>{msg}</div>}

                                <input
                                    className={styles.input}
                                    type="email"
                                    placeholder="Email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <input
                                    className={styles.input}
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button type="submit" className={styles.btnPrimary}>
                                    {isRegistering ? "Sign Up" : "Sign In"}
                                </button>
                                <button
                                    type="button"
                                    className={styles.textBtn}
                                    onClick={() => {
                                        setIsRegistering(!isRegistering);
                                        setError(null);
                                        setMsg(null);
                                    }}
                                >
                                    {isRegistering
                                        ? "Already have an account? Sign in"
                                        : "Need an account? Sign up"}
                                </button>
                            </form>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
