/**
 * verify-email
 * 
 * Page to verify and confirm emails, will move to onboarding
 * 
 * @module 
 */
import Link from "next/link"
import styles from "@/styles/pages/auth/verify-email.module.scss"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

interface Props {
    searchParams: Promise<{ success?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props)
{
    const { success } = await searchParams;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Check if logged in
    const { data } = await supabase.auth.getSession();

    if (!data.session)
    {
        // Means we're not logged
        redirect("/login");
    }

    return (
        <main className={styles.page}>
            <Card className={styles.card}>
                <CardHeader className={styles.header}>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>Let's get you verified</CardDescription>
                </CardHeader>
                <CardContent>
                    {success === "true" ? (
                        <>
                            <p>You are fully verified and now ready to onboard!</p>
                            <Link href="/onboarding" className={styles.verifyBtn}>Let's get onboarded!</Link>
                        </>
                    ):(
                        <p>Error occurred, you're not verified. Please try again.</p>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}