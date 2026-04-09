import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";
import styles from "@/styles/pages/companies/member-detail.module.scss";

type CompanyMember = Tables<"company_members">;
type Profile = Tables<"profiles">;
type KanbanCard = Tables<"kanban_cards">;

interface Props {
    params: Promise<{ slug_id: string; member_id: string }>;
}

function formatRole(role: CompanyMember["role"]) {
    if (role === "owner") return "Owner";
    if (role === "admin") return "Admin";
    return "Member";
}

function formatStatus(status: KanbanCard["status"]) {
    if (status === "in_progress") return "In progress";
    if (status === "blocked") return "Blocked";
    if (status === "review") return "In review";
    if (status === "done") return "Done";
    return "Todo";
}

function toDisplayName(profile: Pick<Profile, "first_name" | "last_name" | "user_name"> | null) {
    const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
    return fullName || profile?.user_name || "Unnamed member";
}

function toInitials(label: string) {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default async function MemberDetailPage({ params }: Props) {
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

    const { data: viewerMembership } = await supabase
        .from("company_members")
        .select("id, role")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!viewerMembership) redirect("/dashboard");

    const { data: member } = await supabase
        .from("company_members")
        .select("id, company_id, user_id, role, joined_at")
        .eq("company_id", company.id)
        .eq("id", member_id)
        .maybeSingle();

    if (!member) redirect(`/companies/s/${company.slug}/members`);

    const [{ data: profile }, { data: workspacesData }] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, first_name, last_name, user_name, bio")
            .eq("id", member.user_id)
            .maybeSingle(),
        supabase
            .from("workspaces")
            .select("id, name, owner_id, status")
            .eq("company_id", company.id)
            .order("name", { ascending: true }),
    ]);

    const workspaces = workspacesData ?? [];
    const workspaceIds = workspaces.map((workspace) => workspace.id);

    let workspaceMemberships: Pick<Tables<"workspace_members">, "workspace_id" | "role">[] = [];
    let assignedCards: Pick<Tables<"kanban_cards">, "id" | "title" | "status" | "priority" | "updated_at" | "workspace_id">[] = [];

    if (workspaceIds.length > 0) {
        const [{ data: membershipsData }, { data: cardsData }] = await Promise.all([
            supabase
                .from("workspace_members")
                .select("workspace_id, role")
                .eq("user_id", member.user_id)
                .in("workspace_id", workspaceIds),
            supabase
                .from("kanban_cards")
                .select("id, title, status, priority, updated_at, workspace_id")
                .eq("assignee_id", member.user_id)
                .in("workspace_id", workspaceIds)
                .order("updated_at", { ascending: false }),
        ]);

        workspaceMemberships = membershipsData ?? [];
        assignedCards = cardsData ?? [];
    }

    const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

    const ownedWorkspaceIds = new Set(
        workspaces
            .filter((workspace) => workspace.owner_id === member.user_id)
            .map((workspace) => workspace.id)
    );

    const memberWorkspaceRows = workspaceMemberships.map((entry) => {
        const workspace = workspaceById.get(entry.workspace_id);
        return {
            id: entry.workspace_id,
            name: workspace?.name ?? "Workspace",
            status: workspace?.status ?? "active",
            access: ownedWorkspaceIds.has(entry.workspace_id) ? "owner" : entry.role,
        };
    });

    for (const workspace of workspaces) {
        if (workspace.owner_id === member.user_id && !memberWorkspaceRows.some((entry) => entry.id === workspace.id)) {
            memberWorkspaceRows.push({
                id: workspace.id,
                name: workspace.name,
                status: workspace.status,
                access: "owner",
            });
        }
    }

    memberWorkspaceRows.sort((a, b) => a.name.localeCompare(b.name));

    const doneCount = assignedCards.filter((card) => card.status === "done").length;
    const inProgressCount = assignedCards.filter((card) => card.status === "in_progress").length;
    const completionRate = assignedCards.length > 0 ? Math.round((doneCount / assignedCards.length) * 100) : 0;

    const canManage =
        (viewerMembership.role === "owner" || viewerMembership.role === "admin") &&
        member.role !== "owner" &&
        member.user_id !== user.id;

    const displayName = toDisplayName(profile);

    return (
        <div className={styles.page}>
            <header className={styles.pageHeader}>
                <div className={styles.headerMain}>
                    <span className={styles.avatar}>{toInitials(displayName)}</span>
                    <div>
                        <h1 className={styles.pageTitle}>{displayName}</h1>
                        <p className={styles.pageDesc}>
                            @{profile?.user_name ?? "unknown"} · {formatRole(member.role)} · Joined {new Date(member.joined_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <Link href={`/companies/s/${company.slug}/members`} className={styles.secondaryBtn}>All members</Link>
                    {canManage && (
                        <Link href={`/companies/s/${company.slug}/members/${member.id}/edit`} className={styles.primaryBtn}>Edit member</Link>
                    )}
                </div>
            </header>

            <section className={styles.statsRow}>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{memberWorkspaceRows.length}</p>
                    <p className={styles.statLabel}>Workspace access</p>
                </article>
                <article className={styles.statCard}>
                    <p className={styles.statValue}>{assignedCards.length}</p>
                    <p className={styles.statLabel}>Assigned tasks</p>
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
                    <p className={styles.statValue}>{completionRate}%</p>
                    <p className={styles.statLabel}>Completion rate</p>
                </article>
            </section>

            <div className={styles.layout}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Assigned tasks</h2>
                        <span>{assignedCards.length} records</span>
                    </div>

                    {assignedCards.length === 0 ? (
                        <p className={styles.empty}>No assigned tasks in this company yet.</p>
                    ) : (
                        <ul className={styles.taskList}>
                            {assignedCards.slice(0, 12).map((card) => (
                                <li key={card.id} className={styles.taskRow}>
                                    <p>{card.title}</p>
                                    <span>{workspaceById.get(card.workspace_id)?.name ?? "Workspace"}</span>
                                    <span>{formatStatus(card.status)}</span>
                                    <time>{new Date(card.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside className={styles.sideColumn}>
                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Profile</h2>
                        </div>
                        <dl className={styles.infoList}>
                            <div>
                                <dt>Username</dt>
                                <dd>@{profile?.user_name ?? "unknown"}</dd>
                            </div>
                            <div>
                                <dt>Company role</dt>
                                <dd>{formatRole(member.role)}</dd>
                            </div>
                            <div>
                                <dt>Bio</dt>
                                <dd>{profile?.bio?.trim() ? profile.bio : "No bio provided."}</dd>
                            </div>
                        </dl>
                    </section>

                    <section className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Workspace access</h2>
                            <span>{memberWorkspaceRows.length}</span>
                        </div>

                        {memberWorkspaceRows.length === 0 ? (
                            <p className={styles.empty}>No workspace assignments yet.</p>
                        ) : (
                            <ul className={styles.workspaceList}>
                                {memberWorkspaceRows.map((workspace) => (
                                    <li key={workspace.id}>
                                        <p>{workspace.name}</p>
                                        <span>{workspace.access} · {workspace.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}
