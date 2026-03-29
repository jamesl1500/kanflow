"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "@/styles/pages/settings.module.scss";

const ChangeEmailSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ChangeEmailData = z.infer<typeof ChangeEmailSchema>;

interface ChangeEmailTabProps {
    currentEmail: string;
}

export default function ChangeEmailTab({ currentEmail }: ChangeEmailTabProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ChangeEmailData>({
        resolver: zodResolver(ChangeEmailSchema),
        defaultValues: { email: currentEmail },
    });

    const onSubmit = async (data: ChangeEmailData) => {
        setServerError(null);
        setSuccess(false);
        setIsLoading(true);

        try {
            const res = await fetch("/api/settings/change-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (!res.ok) {
                setServerError(result.error ?? "Something went wrong");
                return;
            }

            setSuccess(true);
        } catch {
            setServerError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.tabPanel}>
            <p className={styles.sectionDescription}>
                Update the email address associated with your account. A confirmation link will be sent to the new address.
            </p>

            <form className={styles.section} onSubmit={handleSubmit(onSubmit)}>
                {serverError && <p className={styles.serverError}>{serverError}</p>}
                {success && (
                    <p className={styles.successMessage}>
                        Confirmation email sent. Please check your inbox to verify the new address.
                    </p>
                )}

                <div className={styles.field}>
                    <Label htmlFor="email">New email address</Label>
                    <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        aria-invalid={!!errors.email}
                    />
                    {errors.email && <span className={styles.fieldError}>{errors.email.message}</span>}
                </div>

                <div className={styles.actions}>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving…" : "Update email"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
