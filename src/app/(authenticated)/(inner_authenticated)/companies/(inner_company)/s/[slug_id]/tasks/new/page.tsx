import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import CreateTaskForm from "@/components/companies/tasks/CreateTaskForm";
import styles from "@/styles/pages/companies/tasks.module.scss";

interface Props {
    params: Promise<{ slug_id: string }>;
}

export default async function CreateCompanyTaskPage({ params }: Props) {
    const { slug_id } = await params;

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: company } = await supabase
        .from("companies")
        .select("id, name, slug")
        .eq("slug", slug_id)
        .maybeSingle();

    if (!company) redirect("/dashboard");

    const { data: membership } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) redirect("/dashboard");

    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name, status")
        .eq("company_id", company.id)
        .order("name", { ascending: true });

    if ((workspaces?.length ?? 0) === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Create task</h1>
                        <p className={styles.pageDesc}>You need at least one workspace and list before creating tasks.</p>
                    </div>
                </div>
                <div className={styles.panel}>
                    <p className={styles.empty}>No workspaces found for this company.</p>
                    <div className={styles.actionsRow}>
                        <Link href={`/companies/s/${company.slug}/workspaces/create`} className={styles.primaryBtn}>
                            Create workspace
                        </Link>
                        <Link href={`/companies/s/${company.slug}/tasks`} className={styles.secondaryBtn}>
                            Back to tasks
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const workspaceIds = workspaces!.map((workspace) => workspace.id);

    const { data: lists } = await supabase
        .from("kanban_lists")
        .select("id, workspace_id, name")
        .in("workspace_id", workspaceIds)
        .order("position", { ascending: true });

    if ((lists?.length ?? 0) === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>Create task</h1>
                        <p className={styles.pageDesc}>You need at least one list in a workspace before creating tasks.</p>
                    </div>
                </div>
                <div className={styles.panel}>
                    <p className={styles.empty}>No lists found yet. Open a workspace and add a list first.</p>
                    <div className={styles.actionsRow}>
                        <Link href={`/companies/s/${company.slug}/workspaces`} className={styles.primaryBtn}>
                            Go to workspaces
                        </Link>
                        <Link href={`/companies/s/${company.slug}/tasks`} className={styles.secondaryBtn}>
                            Back to tasks
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Create task</h1>
                    <p className={styles.pageDesc}>Capture details now so execution stays crisp later.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href={`/companies/s/${company.slug}/tasks`} className={styles.secondaryBtn}>
                        Back to tasks
                    </Link>
                </div>
            </div>

            <CreateTaskForm
                companySlug={company.slug}
                workspaces={workspaces ?? []}
                lists={lists ?? []}
            />
        </div>
    );
}
