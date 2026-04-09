import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import EditMemberForm from "@/components/companies/EditMemberForm";
import styles from "@/styles/pages/companies/member-edit.module.scss";

interface Props {
    params: Promise<{ slug_id: string; member_id: string }>;
}

function displayName(profile: { first_name: string; last_name: string; user_name: string | null } | null) {
    const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
    return fullName || profile?.user_name || "Unnamed member";
}

export default async function EditMemberPage({ params }: Props) {
    const { slug_id, member_id } = await params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: company } = await supabase
        .from("companies")
        .select("id, name, slug")
        .eq("slug", slug_id)
        .maybeSingle();

    if (!company) redirect("/dashboard");

    const { data: actorMembership } = await supabase
        .from("company_members")
        .select("id, role")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!actorMembership) redirect("/dashboard");

    if (!['owner', 'admin'].includes(actorMembership.role)) {
        redirect(`/companies/s/${company.slug}/members/${member_id}`);
    }

    const { data: member } = await supabase
        .from("company_members")
        .select("id, user_id, role")
        .eq("company_id", company.id)
        .eq("id", member_id)
        .maybeSingle();

    if (!member) {
        redirect(`/companies/s/${company.slug}/members`);
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, user_name")
        .eq("id", member.user_id)
        .maybeSingle();

    const cannotEdit =
        member.role === 'owner' ||
        member.user_id === user.id ||
        (actorMembership.role === 'admin' && member.role === 'admin');

    if (cannotEdit) {
        redirect(`/companies/s/${company.slug}/members/${member.id}`);
    }

    const username = profile?.user_name ?? 'unknown';

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Edit member</h1>
                    <p className={styles.pageDesc}>
                        Manage role and access for {displayName(profile)} in {company.name}.
                    </p>
                </div>
                <Link href={`/companies/s/${company.slug}/members/${member.id}`} className={styles.backLink}>
                    Back to member
                </Link>
            </header>

            <EditMemberForm
                companyId={company.id}
                memberId={member.id}
                slug={company.slug}
                displayName={displayName(profile)}
                username={username}
                currentRole={member.role}
                canRemove={actorMembership.role === 'owner' || actorMembership.role === 'admin'}
            />
        </div>
    );
}
