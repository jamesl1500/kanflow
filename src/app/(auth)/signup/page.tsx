import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import styles from "@/styles/signup.module.scss"
import SignupForm from "@/components/forms/auth/SignupForm"
import { createClient } from "@/utils/supabase/client"
import { redirect } from "next/navigation"

interface Props {
    searchParams: Promise<{ email?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
    const { email } = await searchParams;
    const invitedEmail = email?.trim().toLowerCase() ?? "";

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
        // Redirect to dashboard or home page if user is already logged in
        redirect("/dashboard")
    }

    return (
        <main className={styles.page}>
            {/* Left panel */}
            <aside className={styles.panel}>
                <div className={styles.panelContent}>
                    <div className={styles.logo}>KanFlow</div>
                    <h1>Organize your work, flow with ease.</h1>
                    <p>
                        KanFlow brings your tasks, boards, and team together in one
                        focused workspace.
                    </p>
                </div>
            </aside>

            {/* Right form section */}
            <section className={styles.formSection}>
                <div className={styles.formWrapper}>
                    <div className={styles.header}>
                        <h2>Create an account</h2>
                        <p>Fill in the details below to get started</p>
                    </div>
                    <SignupForm invitedEmail={invitedEmail} />
                    <p className={styles.footer}>
                        Already have an account?{" "}
                        <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </section>
        </main>
    )
}
