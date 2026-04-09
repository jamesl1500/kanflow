"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "@/styles/signup.module.scss"
import { SignupFormData, SignupFormSchema } from "@/lib/schemas/auth/SignupForm"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

interface SignupFormProps {
    invitedEmail?: string;
}

const SignupForm = ({ invitedEmail = "" }: SignupFormProps) => {
    const router = useRouter()
    const [serverError, setServerError] = useState<string | null>(null)
    const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
        resolver: zodResolver(SignupFormSchema),
    })

    const onSubmit = async (data: SignupFormData) => {
        setServerError(null)
        setIsLoading(true)

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                }),
            })

            const result = await res.json()

            if (!res.ok) {
                setServerError(result.error ?? "Something went wrong")
                return
            }

            if (result.requiresConfirmation) {
                setConfirmationMessage("Check your email to confirm your account before signing in.")
                return
            }

            router.push(result.redirect)
        } catch {
            setServerError("Something went wrong. Please try again.")
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.row}>
                <div className={styles.field}>
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                        id="firstName"
                        type="text"
                        placeholder="Jane"
                        autoComplete="given-name"
                        required
                        {...register("firstName")}
                    />
                    {errors.firstName && <p className={styles.error}>{errors.firstName.message}</p>}
                </div>
                <div className={styles.field}>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        autoComplete="family-name"
                        required
                        {...register("lastName")}
                    />
                    {errors.lastName && <p className={styles.error}>{errors.lastName.message}</p>}
                </div>
            </div>

            <div className={styles.field}>
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    defaultValue={invitedEmail}
                    {...register("email")}
                />
                {errors.email && <p className={styles.error}>{errors.email.message}</p>}
            </div>

            <div className={styles.field}>
                <Label htmlFor="password">Password</Label>
                <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    {...register("password")}
                />
                {errors.password && <p className={styles.error}>{errors.password.message}</p>}
            </div>

            <div className={styles.field}>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    {...register("confirmPassword")}
                />
                {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword.message}</p>}
            </div>

            {serverError && <p className={styles.error}>{serverError}</p>}
            {confirmationMessage && <p className={styles.success}>{confirmationMessage}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account…" : "Create account"}
            </Button>
        </form>
    );
}
export default SignupForm;