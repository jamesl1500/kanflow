"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "@/styles/pages/settings.module.scss";

const BasicInfoSchema = z.object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

type BasicInfoData = z.infer<typeof BasicInfoSchema>;

interface BasicInfoTabProps {
    firstName: string;
    lastName: string;
    username: string;
}

export default function BasicInfoTab({ firstName, lastName, username }: BasicInfoTabProps) {
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<BasicInfoData>({
        resolver: zodResolver(BasicInfoSchema),
        defaultValues: { first_name: firstName, last_name: lastName, username },
    });

    const onSubmit = async (data: BasicInfoData) => {
        setServerError(null);
        setSuccess(false);
        setIsLoading(true);

        try {
            const res = await fetch("/api/settings/basic-info", {
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
            <p className={styles.sectionDescription}>Update your name and username.</p>

            <form className={styles.section} onSubmit={handleSubmit(onSubmit)}>
                {serverError && <p className={styles.serverError}>{serverError}</p>}
                {success && <p className={styles.successMessage}>Changes saved successfully.</p>}

                <div className={styles.formRow}>
                    <div className={styles.field}>
                        <Label htmlFor="first_name">First name</Label>
                        <Input id="first_name" {...register("first_name")} aria-invalid={!!errors.first_name} />
                        {errors.first_name && <span className={styles.fieldError}>{errors.first_name.message}</span>}
                    </div>
                    <div className={styles.field}>
                        <Label htmlFor="last_name">Last name</Label>
                        <Input id="last_name" {...register("last_name")} aria-invalid={!!errors.last_name} />
                        {errors.last_name && <span className={styles.fieldError}>{errors.last_name.message}</span>}
                    </div>
                </div>

                <div className={styles.field}>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" {...register("username")} aria-invalid={!!errors.username} />
                    {errors.username && <span className={styles.fieldError}>{errors.username.message}</span>}
                </div>

                <div className={styles.actions}>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
