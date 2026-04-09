import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database";
import InviteMemberDialog from "@/components/companies/InviteMemberDialog";
import styles from "@/styles/pages/companies/members.module.scss";

type CompanyMember = Tables<"company_members">;
type Profile = Tables<"profiles">;
type Workspace = Tables<"workspaces">;
type WorkspaceMember = Tables<"workspace_members">;
type KanbanCard = Tables<"kanban_cards">;

interface Props {
	params: Promise<{ slug_id: string }>;
}

type MemberStats = {
	member: CompanyMember;
	displayName: string;
	username: string | null;
	initials: string;
	workspaceCount: number;
	assignedCount: number;
	doneAssignedCount: number;
	completionRate: number;
	lastActiveAt: string;
};

function formatRole(role: CompanyMember["role"]) {
	if (role === "owner") return "Owner";
	if (role === "admin") return "Admin";
	return "Member";
}

function roleClassName(role: CompanyMember["role"]) {
	if (role === "owner") return styles.roleOwner;
	if (role === "admin") return styles.roleAdmin;
	return styles.roleMember;
}

function toInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "--";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDate(dateValue: string) {
	return new Date(dateValue).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function pct(value: number, total: number) {
	if (total <= 0) return 0;
	return Math.round((value / total) * 100);
}

export default async function MembersPage({ params }: Props) {
	const { slug_id } = await params;

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

	const canInvite = viewerMembership.role === "owner" || viewerMembership.role === "admin";
	const canManageMembers = canInvite;

	const [{ data: membersData }, { data: workspacesData }] = await Promise.all([
		supabase
			.from("company_members")
			.select("id, company_id, user_id, role, joined_at")
			.eq("company_id", company.id)
			.order("joined_at", { ascending: true }),
		supabase
			.from("workspaces")
			.select("id, company_id, owner_id, name, status, created_at, updated_at, description")
			.eq("company_id", company.id)
			.order("name", { ascending: true }),
	]);

	const members = membersData ?? [];
	const workspaces = (workspacesData ?? []) as Workspace[];

	const memberUserIds = members.map((m) => m.user_id);
	const workspaceIds = workspaces.map((workspace) => workspace.id);

	let profiles: Pick<Profile, "id" | "first_name" | "last_name" | "user_name">[] = [];
	let workspaceMembers: Pick<WorkspaceMember, "workspace_id" | "user_id" | "role">[] = [];
	let cards: Pick<KanbanCard, "id" | "workspace_id" | "assignee_id" | "status" | "updated_at">[] = [];

	if (memberUserIds.length > 0) {
		const { data: profilesData } = await supabase
			.from("profiles")
			.select("id, first_name, last_name, user_name")
			.in("id", memberUserIds);
		profiles = profilesData ?? [];
	}

	if (workspaceIds.length > 0) {
		const [{ data: workspaceMembersData }, { data: cardsData }] = await Promise.all([
			supabase
				.from("workspace_members")
				.select("workspace_id, user_id, role")
				.in("workspace_id", workspaceIds),
			supabase
				.from("kanban_cards")
				.select("id, workspace_id, assignee_id, status, updated_at")
				.in("workspace_id", workspaceIds),
		]);

		workspaceMembers = workspaceMembersData ?? [];
		cards = cardsData ?? [];
	}

	const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

	const workspaceIdsByUser = new Map<string, Set<string>>();
	for (const workspace of workspaces) {
		const ownerSet = workspaceIdsByUser.get(workspace.owner_id) ?? new Set<string>();
		ownerSet.add(workspace.id);
		workspaceIdsByUser.set(workspace.owner_id, ownerSet);
	}

	for (const wm of workspaceMembers) {
		const current = workspaceIdsByUser.get(wm.user_id) ?? new Set<string>();
		current.add(wm.workspace_id);
		workspaceIdsByUser.set(wm.user_id, current);
	}

	const cardStatsByAssignee = new Map<string, { total: number; done: number; lastActiveAt: string | null }>();
	let unassignedCardCount = 0;

	for (const card of cards) {
		if (!card.assignee_id) {
			unassignedCardCount += 1;
			continue;
		}

		const current = cardStatsByAssignee.get(card.assignee_id) ?? {
			total: 0,
			done: 0,
			lastActiveAt: null,
		};

		current.total += 1;
		if (card.status === "done") current.done += 1;
		if (!current.lastActiveAt || new Date(card.updated_at) > new Date(current.lastActiveAt)) {
			current.lastActiveAt = card.updated_at;
		}

		cardStatsByAssignee.set(card.assignee_id, current);
	}

	const memberRows: MemberStats[] = members.map((member) => {
		const profile = profileById.get(member.user_id);
		const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
		const displayName = fullName || profile?.user_name || "Unnamed member";
		const assigneeStats = cardStatsByAssignee.get(member.user_id);
		const assignedCount = assigneeStats?.total ?? 0;
		const doneAssignedCount = assigneeStats?.done ?? 0;
		const completionRate = pct(doneAssignedCount, assignedCount);

		return {
			member,
			displayName,
			username: profile?.user_name ?? null,
			initials: toInitials(displayName),
			workspaceCount: workspaceIdsByUser.get(member.user_id)?.size ?? 0,
			assignedCount,
			doneAssignedCount,
			completionRate,
			lastActiveAt: assigneeStats?.lastActiveAt ?? member.joined_at,
		};
	});

	const ownerCount = members.filter((member) => member.role === "owner").length;
	const adminCount = members.filter((member) => member.role === "admin").length;
	const standardCount = members.filter((member) => member.role === "member").length;

	const totalAssigned = memberRows.reduce((sum, row) => sum + row.assignedCount, 0);
	const totalDoneAssigned = memberRows.reduce((sum, row) => sum + row.doneAssignedCount, 0);
	const averageWorkspaces = members.length > 0
		? (memberRows.reduce((sum, row) => sum + row.workspaceCount, 0) / members.length).toFixed(1)
		: "0.0";

	const activeWorkspaceCount = workspaces.filter((workspace) => workspace.status === "active").length;
	const archivedWorkspaceCount = workspaces.filter((workspace) => workspace.status === "archived").length;

	const recentlyJoined = [...memberRows]
		.sort((a, b) => new Date(b.member.joined_at).getTime() - new Date(a.member.joined_at).getTime())
		.slice(0, 4);

	return (
		<div className={styles.page}>
			<header className={styles.pageHeader}>
				<div>
					<h1 className={styles.pageTitle}>Members</h1>
					<p className={styles.pageDesc}>
						Team roster, access roles, and workspace contribution metrics for {company.name}.
					</p>
				</div>

				<div className={styles.headerActions}>
					<Link href={`/companies/s/${company.slug}/settings`} className={styles.secondaryBtn}>
						Manage roles
					</Link>
					<InviteMemberDialog companyId={company.id} canInvite={canInvite} />
				</div>
			</header>

			<section className={styles.statsRow}>
				<article className={styles.statCard}>
					<p className={styles.statValue}>{members.length}</p>
					<p className={styles.statLabel}>Total members</p>
				</article>
				<article className={styles.statCard}>
					<p className={styles.statValue}>{ownerCount + adminCount}</p>
					<p className={styles.statLabel}>Privileged roles</p>
				</article>
				<article className={styles.statCard}>
					<p className={styles.statValue}>{totalAssigned}</p>
					<p className={styles.statLabel}>Assigned tasks</p>
				</article>
				<article className={styles.statCard}>
					<p className={styles.statValue}>{pct(totalDoneAssigned, totalAssigned)}%</p>
					<p className={styles.statLabel}>Task completion</p>
				</article>
				<article className={styles.statCard}>
					<p className={styles.statValue}>{averageWorkspaces}</p>
					<p className={styles.statLabel}>Avg workspaces/member</p>
				</article>
			</section>

			<div className={styles.layout}>
				<section className={styles.panel}>
					<div className={styles.panelHeader}>
						<h2>Member roster</h2>
						<span>{members.length} records</span>
					</div>

					{memberRows.length === 0 ? (
						<p className={styles.empty}>No members found for this company yet.</p>
					) : (
						<ul className={styles.memberList}>
							{memberRows.map((row) => {
								const canEditMember =
									canManageMembers &&
									row.member.role !== "owner" &&
									row.member.user_id !== user.id &&
									!(viewerMembership.role === "admin" && row.member.role === "admin");

								return (
								<li key={row.member.id} className={styles.memberRow}>
									<div className={styles.memberIdentity}>
										<span className={styles.avatar}>{row.initials}</span>
										<div>
											<Link href={`/companies/s/${company.slug}/members/${row.member.id}`} className={styles.memberNameLink}>
												<p className={styles.memberName}>{row.displayName}</p>
											</Link>
											<p className={styles.memberMeta}>
												{row.username ? `@${row.username}` : "No username"}
												{" · Joined "}
												{formatDate(row.member.joined_at)}
											</p>
										</div>
									</div>

									<span className={`${styles.roleBadge} ${roleClassName(row.member.role)}`}>
										{formatRole(row.member.role)}
									</span>

									<div className={styles.rowActions}>
										<Link href={`/companies/s/${company.slug}/members/${row.member.id}`} className={styles.actionLink}>
											View
										</Link>
										{canEditMember && (
											<Link href={`/companies/s/${company.slug}/members/${row.member.id}/edit`} className={`${styles.actionLink} ${styles.actionLinkPrimary}`}>
												Edit
											</Link>
										)}
									</div>
								</li>
								);
							})}
						</ul>
					)}
				</section>

				<aside className={styles.sideColumn}>
					<section className={styles.panel}>
						<div className={styles.panelHeader}>
							<h2>Role distribution</h2>
						</div>

						<div className={styles.stack}>
							<div className={styles.roleStatRow}>
								<p>Owners</p>
								<span>{ownerCount}</span>
							</div>
							<div className={styles.progressTrack}>
								<div className={styles.progressFillOwner} style={{ width: `${pct(ownerCount, members.length)}%` }} />
							</div>

							<div className={styles.roleStatRow}>
								<p>Admins</p>
								<span>{adminCount}</span>
							</div>
							<div className={styles.progressTrack}>
								<div className={styles.progressFillAdmin} style={{ width: `${pct(adminCount, members.length)}%` }} />
							</div>

							<div className={styles.roleStatRow}>
								<p>Members</p>
								<span>{standardCount}</span>
							</div>
							<div className={styles.progressTrack}>
								<div className={styles.progressFillMember} style={{ width: `${pct(standardCount, members.length)}%` }} />
							</div>
						</div>
					</section>

					<section className={styles.panel}>
						<div className={styles.panelHeader}>
							<h2>Workspace coverage</h2>
						</div>

						<ul className={styles.kpiList}>
							<li>
								<span>Active workspaces</span>
								<strong>{activeWorkspaceCount}</strong>
							</li>
							<li>
								<span>Archived workspaces</span>
								<strong>{archivedWorkspaceCount}</strong>
							</li>
							<li>
								<span>Unassigned tasks</span>
								<strong>{unassignedCardCount}</strong>
							</li>
							<li>
								<span>Done assigned tasks</span>
								<strong>{totalDoneAssigned}</strong>
							</li>
						</ul>
					</section>

					<section className={styles.panel}>
						<div className={styles.panelHeader}>
							<h2>Recently joined</h2>
						</div>

						{recentlyJoined.length === 0 ? (
							<p className={styles.empty}>No recent joins.</p>
						) : (
							<ul className={styles.joinedList}>
								{recentlyJoined.map((row) => (
									<li key={row.member.id}>
										<div>
											<p>{row.displayName}</p>
											<span>{formatRole(row.member.role)}</span>
										</div>
										<time>{formatDate(row.member.joined_at)}</time>
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
