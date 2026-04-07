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
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({ searchParams })
{   
    const { params } = await searchParams;
    const success = params.success;

    const supabase = createClient();

    // Check if logged in
    const {data, error} = await supabase.auth.getSession();

    if(!data)
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
                    {success == "true" ? (
                        <>
                            <p>You are fully verified and now ready to onboard!</p>
                            <Link href="/onboarding" className={styles.verifyBtn}>Let's get onboarded!</Link>
                        </>
                    ):(
                        <p>Error occured, you're not verified! Please try again.</p>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}