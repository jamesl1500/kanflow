import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsTabs from "@/components/settings/SettingsTabs";
import styles from "@/styles/pages/settings.module.scss";

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, user_name")
        .eq("id", user.id)
        .single();

    return (
        <div className={styles.settingsPage}>
            <div className={styles.settingsHeader}>
                <h1>Settings</h1>
                <p>Manage your account preferences.</p>
            </div>
            <SettingsTabs
                firstName={profile?.first_name ?? ""}
                lastName={profile?.last_name ?? ""}
                username={profile?.user_name ?? ""}
                email={user.email ?? ""}
            />
        </div>
    );
}