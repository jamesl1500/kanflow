import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";
import styles from "@/styles/pages/companies/tasks.module.scss";

type KanbanCard = Tables<"kanban_cards">;

type Priority = KanbanCard["priority"];
type Status = KanbanCard["status"];

function priorityClass(priority: Priority) {
    if (priority === "high") return styles.priorityHigh;
    if (priority === "medium") return styles.priorityMedium;
    return styles.priorityLow;
}

function statusClass(status: Status) {
    if (status === "blocked") return styles.statusBlocked;
    if (status === "review") return styles.statusReview;
    if (status === "done") return styles.statusDone;
    if (status === "in_progress") return styles.statusInProgress;
    return styles.statusTodo;
}

function formatStatus(status: Status) {
    if (status === "in_progress") return "In progress";
    if (status === "blocked") return "Blocked";
    if (status === "review") return "In review";
    if (status === "done") return "Done";
    return "Todo";
}

interface Props {
    params: Promise<{ slug_id: string }>;
}

export default async function CompanyTasksPage({ params }: Props) {
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

    const workspaceIds = (workspaces ?? []).map((workspace) => workspace.id);

    let lists: Pick<Tables<"kanban_lists">, "id" | "name" | "workspace_id">[] = [];
    let tasks: Pick<Tables<"kanban_cards">, "id" | "title" | "priority" | "status" | "due_date" | "estimate_points" | "workspace_id" | "list_id" | "tags" | "updated_at">[] = [];
    let subtasks: Pick<Tables<"kanban_subtasks">, "id" | "card_id" | "is_completed">[] = [];

    if (workspaceIds.length > 0) {
        const [{ data: listsData }, { data: tasksData }] = await Promise.all([
            supabase
                .from("kanban_lists")
                .select("id, name, workspace_id")
                .in("workspace_id", workspaceIds)
                .order("position", { ascending: true }),
            supabase
                .from("kanban_cards")
                .select("id, title, priority, status, due_date, estimate_points, workspace_id, list_id, tags, updated_at")
                .in("workspace_id", workspaceIds)
                .order("updated_at", { ascending: false }),
        ]);

        lists = listsData ?? [];
        tasks = tasksData ?? [];

        if ((tasksData?.length ?? 0) > 0) {
            const taskIds = tasksData!.map((task) => task.id);
            const { data: subtasksData } = await supabase
                .from("kanban_subtasks")
                .select("id, card_id, is_completed")
                .in("card_id", taskIds);
            subtasks = subtasksData ?? [];
        }
    }

    const workspaceById = new Map((workspaces ?? []).map((workspace) => [workspace.id, workspace.name]));
    const listById = new Map(lists.map((list) => [list.id, list.name]));

    const subtaskProgressByTaskId = subtasks.reduce((acc, subtask) => {
        const current = acc.get(subtask.card_id) ?? { total: 0, completed: 0 };
        current.total += 1;
        if (subtask.is_completed) current.completed += 1;
        acc.set(subtask.card_id, current);
        return acc;
    }, new Map<string, { total: number; completed: number }>());

    const now = new Date();
    const dueSoonLimit = new Date(now);
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 7);

    const overdueCount = tasks.filter((task) => task.due_date && new Date(task.due_date) < now && task.status !== "done").length;
    const dueSoonCount = tasks.filter((task) => task.due_date && new Date(task.due_date) >= now && new Date(task.due_date) <= dueSoonLimit && task.status !== "done").length;
    const doneCount = tasks.filter((task) => task.status === "done").length;
    const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Tasks</h1>
                    <p className={styles.pageDesc}>Company-wide task tracking for {company.name}.</p>
                </div>
                <div className={styles.headerActions}>
                    <Link href={`/companies/s/${company.slug}/tasks/new`} className={styles.primaryBtn}>
                        New task
                    </Link>
                </div>
            </div>

            <section className={styles.statsRow}>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{tasks.length}</p>
                    <p className={styles.statLabel}>Total tasks</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{inProgressCount}</p>
                    <p className={styles.statLabel}>In progress</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{doneCount}</p>
                    <p className={styles.statLabel}>Done</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{dueSoonCount}</p>
                    <p className={styles.statLabel}>Due in 7 days</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{overdueCount}</p>
                    <p className={styles.statLabel}>Overdue</p>
                </article>
            </section>

            <div className={styles.grid}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>All tasks</h2>
                        <span>{tasks.length} records</span>
                    </div>

                    {tasks.length === 0 ? (
                        <p className={styles.empty}>No tasks yet. Create one to get started.</p>
                    ) : (
                        <ul className={styles.taskList}>
                            {tasks.map((task) => {
                                const workspaceName = workspaceById.get(task.workspace_id) ?? "Workspace";
                                const listName = listById.get(task.list_id) ?? "List";
                                const progress = subtaskProgressByTaskId.get(task.id);

                                return (
                                    <li key={task.id} className={styles.taskItem}>
                                        <div className={styles.taskMain}>
                                            <Link href={`/companies/s/${company.slug}/tasks/${task.id}`} className={styles.taskName}>
                                                {task.title}
                                            </Link>
                                            <p className={styles.taskMeta}>
                                                {workspaceName} · {listName}
                                                {progress ? ` · Subtasks ${progress.completed}/${progress.total}` : ""}
                                            </p>
                                        </div>

                                        <span className={`${styles.badge} ${priorityClass(task.priority)}`}>
                                            {task.priority}
                                        </span>

                                        <span className={`${styles.badge} ${statusClass(task.status)}`}>
                                            {formatStatus(task.status)}
                                        </span>

                                        <span className={styles.points}>
                                            {typeof task.estimate_points === "number" ? `${task.estimate_points} pts` : "-"}
                                        </span>

                                        <span className={styles.dueDate}>
                                            {task.due_date
                                                ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                : "No due date"}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
