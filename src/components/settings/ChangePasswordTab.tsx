"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "@/styles/pages/settings.module.scss";

const ChangePasswordSchema = z
    .object({
        current_password: z.string().min(1, "Current password is required"),
        new_password: z.string().min(8, "New password must be at least 8 characters"),
        confirm_password: z.string().min(1, "Please confirm your new password"),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: "Passwords do not match",
        path: ["confirm_password"],
    });

type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;

export default function ChangePasswordTab() {
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordData>({
        resolver: zodResolver(ChangePasswordSchema),
    });

    const onSubmit = async (data: ChangePasswordData) => {
        setServerError(null);
        setSuccess(false);
        setIsLoading(true);

        try {
            const res = await fetch("/api/settings/change-password", {
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
            reset();
        } catch {
            setServerError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.tabPanel}>
            <p className={styles.sectionDescription}>
                Choose a strong password you don&apos;t use elsewhere.
            </p>

            <form className={styles.section} onSubmit={handleSubmit(onSubmit)}>
                {serverError && <p className={styles.serverError}>{serverError}</p>}
                {success && <p className={styles.successMessage}>Password updated successfully.</p>}

                <div className={styles.field}>
                    <Label htmlFor="current_password">Current password</Label>
                    <Input
                        id="current_password"
                        type="password"
                        autoComplete="current-password"
                        {...register("current_password")}
                        aria-invalid={!!errors.current_password}
                    />
                    {errors.current_password && (
                        <span className={styles.fieldError}>{errors.current_password.message}</span>
                    )}
                </div>

                <div className={styles.field}>
                    <Label htmlFor="new_password">New password</Label>
                    <Input
                        id="new_password"
                        type="password"
                        autoComplete="new-password"
                        {...register("new_password")}
                        aria-invalid={!!errors.new_password}
                    />
                    {errors.new_password && (
                        <span className={styles.fieldError}>{errors.new_password.message}</span>
                    )}
                </div>

                <div className={styles.field}>
                    <Label htmlFor="confirm_password">Confirm new password</Label>
                    <Input
                        id="confirm_password"
                        type="password"
                        autoComplete="new-password"
                        {...register("confirm_password")}
                        aria-invalid={!!errors.confirm_password}
                    />
                    {errors.confirm_password && (
                        <span className={styles.fieldError}>{errors.confirm_password.message}</span>
                    )}
                </div>

                <div className={styles.actions}>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving…" : "Update password"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
