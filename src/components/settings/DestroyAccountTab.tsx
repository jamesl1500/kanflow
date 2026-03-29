"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "@/styles/pages/settings.module.scss";

const CONFIRM_PHRASE = "delete my account";

export default function DestroyAccountTab() {
    const router = useRouter();
    const [confirmValue, setConfirmValue] = useState("");
    const [serverError, setServerError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const isConfirmed = confirmValue === CONFIRM_PHRASE;

    const handleDestroy = async () => {
        if (!isConfirmed) return;

        setServerError(null);
        setIsLoading(true);

        try {
            const res = await fetch("/api/settings/destroy-account", {
                method: "DELETE",
            });

            const result = await res.json();

            if (!res.ok) {
                setServerError(result.error ?? "Something went wrong");
                return;
            }

            router.push("/login");
        } catch {
            setServerError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.tabPanel}>
            <p className={styles.sectionDescription}>
                Permanently delete your account and all associated data.
            </p>

            <div className={styles.dangerZone}>
                <div className={styles.dangerZoneHeader}>
                    <h2>Delete account</h2>
                    <p>
                        This action is irreversible. All your data, workspaces, and boards will be permanently deleted.
                    </p>
                </div>

                {serverError && <p className={styles.serverError}>{serverError}</p>}

                <div className={styles.dangerConfirmField}>
                    <Label htmlFor="confirm_delete">
                        Type <span>{CONFIRM_PHRASE}</span> to confirm
                    </Label>
                    <Input
                        id="confirm_delete"
                        type="text"
                        value={confirmValue}
                        onChange={(e) => setConfirmValue(e.target.value)}
                        placeholder={CONFIRM_PHRASE}
                        autoComplete="off"
                    />
                </div>

                <div className={styles.actions}>
                    <Button
                        type="button"
                        variant="destructive"
                        disabled={!isConfirmed || isLoading}
                        onClick={handleDestroy}
                    >
                        {isLoading ? "Deleting…" : "Permanently delete account"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
