import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import styles from "./AddStationModal.module.css";
import { apiClient } from "../../lib/apiClient";

interface Props {
    lat: number;
    lng: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddStationModal({ lat, lng, onClose, onSuccess }: Props) {
    const [name, setName] = useState("");
    const [type, setType] = useState("RIVER");
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modalRef.current) {
            L.DomEvent.disableClickPropagation(modalRef.current);
            L.DomEvent.disableScrollPropagation(modalRef.current);
        }
    }, []);

    const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMessage("Please enter a valid station name.");
            return;
        }

        setSaving(true);
        setErrorMessage(null);

        try {
            await apiClient.createStation({
                name: name.trim(),
                latitude: lat,
                longitude: lng,
                type,
            });

            onSuccess();
            onClose();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            setErrorMessage(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            ref={modalRef}
            className={styles.modalOverlay}
            role="dialog"
            aria-labelledby="modal-title"
        >
            <h3 id="modal-title" className={styles.title}>
                Add Spot
            </h3>

            {errorMessage && <p className={styles.error}>{errorMessage}</p>}

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.field}>
                    <label htmlFor="station-name" className={styles.label}>
                        Spot Name
                    </label>
                    <input
                        id="station-name"
                        type="text"
                        className={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Foz do Rio Neiva"
                        required
                        disabled={saving}
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="station-type" className={styles.label}>
                        Water Body Type
                    </label>
                    <select
                        id="station-type"
                        className={styles.select}
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        disabled={saving}
                    >
                        <option value="RIVER">River</option>
                        <option value="RESERVOIR">Reservoir / Dam</option>
                        <option value="ESTUARY">Estuary / River Mouth</option>
                        <option value="LAGOON">Lagoon</option>
                        <option value="COASTAL">Coastal Beach</option>
                    </select>
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button type="submit" className={styles.submitButton} disabled={saving}>
                        {saving ? "Saving" : "Save Spot"}
                    </button>
                </div>
            </form>
        </div>
    );
}
