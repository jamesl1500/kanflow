import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import styles from "@/styles/shared/headers/authenticated-header.module.scss";
import Link from "next/link";
import UserDropdown from "@/components/shared/headers/UserDropdown";

export default async function AuthenticatedHeader() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    let firstName = "";
    let lastName = "";

    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", user.id)
            .single();

        if (profile) {
            firstName = profile.first_name ?? "";
            lastName = profile.last_name ?? "";
        }
    }

    return (
        <header className={styles.authenticated_header}>
            <div className={styles.authenticated_header_brand}>
                <Link href="/" className={styles.authenticated_header_brand_logo}>
                    <span className={styles.authenticated_header_brand_logo}>Kanflow</span>
                </Link>
            </div>
            <UserDropdown firstName={firstName} lastName={lastName} />
        </header>
    );
}