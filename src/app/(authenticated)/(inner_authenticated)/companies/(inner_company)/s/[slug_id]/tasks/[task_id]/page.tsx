import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import TaskDetailsClient from "@/components/companies/tasks/TaskDetailsClient";
import styles from "@/styles/pages/companies/tasks.module.scss";

interface Props {
    params: Promise<{ slug_id: string; task_id: string }>;
}

export default async function TaskDetailsPage({ params }: Props) {
    const { slug_id, task_id } = await params;

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

    const { data: task } = await supabase
        .from("kanban_cards")
        .select("id, title, description, priority, status, due_date, estimate_points, workspace_id, list_id, tags")
        .eq("id", task_id)
        .maybeSingle();

    if (!task) {
        redirect(`/companies/s/${company.slug}/tasks`);
    }

    const { data: taskWorkspace } = await supabase
        .from("workspaces")
        .select("id, company_id")
        .eq("id", task.workspace_id)
        .maybeSingle();

    if (!taskWorkspace || taskWorkspace.company_id !== company.id) {
        redirect(`/companies/s/${company.slug}/tasks`);
    }

    const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("company_id", company.id)
        .order("name", { ascending: true });

    const workspaceIds = (workspaces ?? []).map((workspace) => workspace.id);

    const [{ data: lists }, { data: subtasks }] = await Promise.all([
        supabase
            .from("kanban_lists")
            .select("id, workspace_id, name")
            .in("workspace_id", workspaceIds)
            .order("position", { ascending: true }),
        supabase
            .from("kanban_subtasks")
            .select("id, title, is_completed, due_date, position")
            .eq("card_id", task.id)
            .order("position", { ascending: true }),
    ]);

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Task details</h1>
                    <p className={styles.pageDesc}>{company.name} · {task.title}</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href={`/companies/s/${company.slug}/tasks`} className={styles.secondaryBtn}>
                        Back to tasks
                    </Link>
                </div>
            </div>

            <TaskDetailsClient
                companySlug={company.slug}
                task={task}
                workspaces={workspaces ?? []}
                lists={lists ?? []}
                subtasks={subtasks ?? []}
            />
        </div>
    );
}
