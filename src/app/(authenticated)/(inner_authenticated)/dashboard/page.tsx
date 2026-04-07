import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Buildings,
    CalendarDots,
    CheckSquare,
    ClockCountdown,
    Kanban,
    TrendUp,
    WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Tables } from "@/types/database";
import styles from "@/styles/pages/dashboard.module.scss";

type Company = Tables<"companies">;
type CompanyMember = Tables<"company_members">;
type Workspace = Tables<"workspaces">;
type KanbanList = Tables<"kanban_lists">;
type KanbanCard = Tables<"kanban_cards">;
type DashboardCard = Pick<
    KanbanCard,
    "id" | "list_id" | "workspace_id" | "title" | "description" | "position" | "assignee_id" | "priority" | "due_date" | "created_at" | "updated_at"
>;

function toStartOfDay(value: string): Date | null {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
}

function getPriorityLabel(priority: KanbanCard["priority"]) {
    if (priority === "high") return "High";
    if (priority === "medium") return "Medium";
    return "Low";
}

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: memberships } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id);

    const hasCompany = (memberships?.length ?? 0) > 0;

    let companies: Company[] = [];
    let workspaces: Workspace[] = [];
    let lists: KanbanList[] = [];
    let cards: DashboardCard[] = [];

    if (hasCompany) {
        const companyIds = Array.from(new Set((memberships ?? []).map((m) => m.company_id)));

        const { data: companiesData } = await supabase
            .from("companies")
            .select("id, name, slug, description, owner_id, created_at, updated_at, logo_id")
            .in("id", companyIds)
            .order("name", { ascending: true });

        companies = companiesData ?? [];

        if (companyIds.length > 0) {
            const { data: workspacesData } = await supabase
                .from("workspaces")
                .select("id, company_id, owner_id, name, description, status, created_at, updated_at")
                .in("company_id", companyIds)
                .order("created_at", { ascending: false });

            workspaces = workspacesData ?? [];

            const workspaceIds = Array.from(new Set(workspaces.map((w) => w.id)));

            if (workspaceIds.length > 0) {
                const [{ data: listsData }, { data: cardsData }] = await Promise.all([
                    supabase
                        .from("kanban_lists")
                        .select("id, workspace_id, name, position, color, created_at, updated_at")
                        .in("workspace_id", workspaceIds),
                    supabase
                        .from("kanban_cards")
                        .select("id, list_id, workspace_id, title, description, position, assignee_id, priority, due_date, created_at, updated_at")
                        .in("workspace_id", workspaceIds),
                ]);

                lists = listsData ?? [];
                cards = cardsData ?? [];
            }
        }
    }

    const membershipByCompanyId = new Map((memberships ?? []).map((m) => [m.company_id, m.role]));
    const workspaceById = new Map(workspaces.map((w) => [w.id, w]));
    const listById = new Map(lists.map((l) => [l.id, l]));

    const companyStats = companies.map((company) => {
        const companyWorkspaces = workspaces.filter((w) => w.company_id === company.id);
        const companyWorkspaceIds = new Set(companyWorkspaces.map((w) => w.id));
        const companyCards = cards.filter((c) => companyWorkspaceIds.has(c.workspace_id));
        const dueSoon = companyCards.filter((card) => {
            if (!card.due_date) return false;
            const dueDay = toStartOfDay(card.due_date);
            if (!dueDay) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const inSevenDays = new Date(today);
            inSevenDays.setDate(inSevenDays.getDate() + 7);
            return dueDay >= today && dueDay <= inSevenDays;
        }).length;

        return {
            ...company,
            role: membershipByCompanyId.get(company.id) ?? "member",
            workspaceCount: companyWorkspaces.length,
            activeWorkspaceCount: companyWorkspaces.filter((w) => w.status === "active").length,
            cardCount: companyCards.length,
            dueSoonCount: dueSoon,
        };
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inSevenDays = new Date(today);
    inSevenDays.setDate(inSevenDays.getDate() + 7);

    const dueCards = cards
        .filter((card) => !!card.due_date)
        .map((card) => ({ card, dueDay: toStartOfDay(card.due_date as string) }))
        .filter((item): item is { card: KanbanCard; dueDay: Date } => !!item.dueDay);

    const overdueCount = dueCards.filter((item) => item.dueDay < today).length;
    const dueSoonCount = dueCards.filter((item) => item.dueDay >= today && item.dueDay <= inSevenDays).length;

    const upcomingCards = dueCards
        .filter((item) => item.dueDay >= today)
        .sort((a, b) => a.dueDay.getTime() - b.dueDay.getTime())
        .slice(0, 8)
        .map((item) => {
            const workspace = workspaceById.get(item.card.workspace_id);
            const company = companies.find((c) => c.id === workspace?.company_id);
            const list = listById.get(item.card.list_id);

            return {
                ...item.card,
                dueDay: item.dueDay,
                workspaceName: workspace?.name ?? "Workspace",
                listName: list?.name ?? "List",
                companyName: company?.name ?? "Company",
                companySlug: company?.slug ?? "",
            };
        });

    const highPriorityCount = cards.filter((card) => card.priority === "high").length;
    const mediumPriorityCount = cards.filter((card) => card.priority === "medium").length;
    const lowPriorityCount = cards.filter((card) => card.priority === "low").length;
    const activeWorkspaceCount = workspaces.filter((w) => w.status === "active").length;
    const archivedWorkspaceCount = workspaces.filter((w) => w.status === "archived").length;

    const recentCards = [...cards]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6)
        .map((card) => {
            const workspace = workspaceById.get(card.workspace_id);
            const company = companies.find((c) => c.id === workspace?.company_id);

            return {
                ...card,
                workspaceName: workspace?.name ?? "Workspace",
                companyName: company?.name ?? "Company",
                companySlug: company?.slug ?? "",
            };
        });

    return (
        <div className={styles.dashboardPage}>
            <div className={styles.dashboardHeader}>
                <h1>Dashboard</h1>
                <p>Cross-company overview of your workspaces, tasks, due dates, and momentum.</p>
            </div>

            <section className={styles.statsGrid}>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><Buildings size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{companyStats.length}</p>
                        <p className={styles.statLabel}>Companies</p>
                    </div>
                </article>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><Kanban size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{workspaces.length}</p>
                        <p className={styles.statLabel}>Workspaces ({activeWorkspaceCount} active)</p>
                    </div>
                </article>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><CheckSquare size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{cards.length}</p>
                        <p className={styles.statLabel}>Total cards/tasks</p>
                    </div>
                </article>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><CalendarDots size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{dueSoonCount}</p>
                        <p className={styles.statLabel}>Due in next 7 days</p>
                    </div>
                </article>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><WarningCircle size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{overdueCount}</p>
                        <p className={styles.statLabel}>Overdue cards</p>
                    </div>
                </article>
                <article className={styles.statCard}>
                    <span className={styles.statIcon}><TrendUp size={18} weight="duotone" /></span>
                    <div>
                        <p className={styles.statValue}>{highPriorityCount}</p>
                        <p className={styles.statLabel}>High-priority cards</p>
                    </div>
                </article>
            </section>

            <div className={styles.dashboardGrid}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Upcoming due tasks</h2>
                        <span>Next 8 cards with due dates</span>
                    </div>

                    {upcomingCards.length === 0 ? (
                        <p className={styles.emptyText}>No upcoming due cards yet.</p>
                    ) : (
                        <ul className={styles.upcomingList}>
                            {upcomingCards.map((card) => (
                                <li key={card.id} className={styles.upcomingItem}>
                                    <div className={styles.upcomingMain}>
                                        <p className={styles.upcomingTitle}>{card.title}</p>
                                        <p className={styles.upcomingMeta}>
                                            {card.companyName} · {card.workspaceName} · {card.listName}
                                        </p>
                                    </div>
                                    <div className={styles.upcomingSide}>
                                        <span className={`${styles.priorityBadge} ${styles[`priority${card.priority[0].toUpperCase()}${card.priority.slice(1)}` as "priorityHigh" | "priorityMedium" | "priorityLow"]}`}>
                                            {getPriorityLabel(card.priority)}
                                        </span>
                                        <span className={styles.dueDate}>
                                            <ClockCountdown size={13} />
                                            {card.dueDay.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Your companies</h2>
                        <span>{companyStats.length} memberships</span>
                    </div>

                    {companyStats.length === 0 ? (
                        <p className={styles.emptyText}>You are not a member of any companies yet.</p>
                    ) : (
                        <ul className={styles.companyList}>
                            {companyStats.map((company) => (
                                <li key={company.id} className={styles.companyItem}>
                                    <div className={styles.companyMain}>
                                        <Link href={`/companies/s/${company.slug}`} className={styles.companyName}>
                                            {company.name}
                                        </Link>
                                        <p className={styles.companyMeta}>
                                            {company.workspaceCount} workspaces · {company.cardCount} cards · {company.dueSoonCount} due soon
                                        </p>
                                    </div>
                                    <div className={styles.companyBadges}>
                                        <span className={styles.roleBadge}>{company.role}</span>
                                        <Link href={`/companies/s/${company.slug}/workspaces`} className={styles.inlineLink}>
                                            Open
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Priority split</h2>
                        <span>Across all your cards</span>
                    </div>

                    <div className={styles.priorityRows}>
                        <div className={styles.priorityRow}>
                            <p>High</p>
                            <span>{highPriorityCount}</span>
                        </div>
                        <div className={styles.priorityRow}>
                            <p>Medium</p>
                            <span>{mediumPriorityCount}</span>
                        </div>
                        <div className={styles.priorityRow}>
                            <p>Low</p>
                            <span>{lowPriorityCount}</span>
                        </div>
                        <div className={styles.priorityRow}>
                            <p>Archived workspaces</p>
                            <span>{archivedWorkspaceCount}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Recently created cards</h2>
                        <span>Latest activity snapshot</span>
                    </div>

                    {recentCards.length === 0 ? (
                        <p className={styles.emptyText}>No cards created yet.</p>
                    ) : (
                        <ul className={styles.recentList}>
                            {recentCards.map((card) => (
                                <li key={card.id} className={styles.recentItem}>
                                    <p className={styles.recentTitle}>{card.title}</p>
                                    <p className={styles.recentMeta}>
                                        {card.companyName} · {card.workspaceName}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {!hasCompany && (
                <div className={styles.createCompanyCta}>
                    <div className={styles.ctaIcon}>
                        <Buildings size={32} weight="duotone" />
                    </div>
                    <div className={styles.ctaBody}>
                        <h2>Create your first company</h2>
                        <p>
                            Companies are shared workspaces where you and your team manage tasks,
                            track progress, and stay accountable together.
                        </p>
                        <Link href="/companies/create" className={styles.ctaButton}>
                            Get started
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
