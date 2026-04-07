'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/types/database";
import styles from "@/styles/pages/companies/tasks.module.scss";

type Workspace = Tables<"workspaces">;
type KanbanList = Tables<"kanban_lists">;

interface Props {
    companySlug: string;
    workspaces: Pick<Workspace, "id" | "name" | "status">[];
    lists: Pick<KanbanList, "id" | "workspace_id" | "name">[];
}

export default function CreateTaskForm({ companySlug, workspaces, lists }: Props) {
    const router = useRouter();
    const defaultWorkspace = workspaces.find((w) => w.status === "active") ?? workspaces[0];
    const [workspaceId, setWorkspaceId] = useState(defaultWorkspace?.id ?? "");

    const filteredLists = useMemo(
        () => lists.filter((list) => list.workspace_id === workspaceId),
        [lists, workspaceId]
    );

    const [listId, setListId] = useState(filteredLists[0]?.id ?? "");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
    const [status, setStatus] = useState<"todo" | "in_progress" | "blocked" | "review" | "done">("todo");
    const [dueDate, setDueDate] = useState("");
    const [estimatePoints, setEstimatePoints] = useState("");
    const [tags, setTags] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function onWorkspaceChange(nextWorkspaceId: string) {
        setWorkspaceId(nextWorkspaceId);
        const nextLists = lists.filter((list) => list.workspace_id === nextWorkspaceId);
        setListId(nextLists[0]?.id ?? "");
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSaving(true);

        const parsedTags = tags
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 12);

        const response = await fetch("/api/companies/tasks/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                company_slug: companySlug,
                workspace_id: workspaceId,
                list_id: listId,
                title,
                description,
                priority,
                status,
                due_date: dueDate || null,
                estimate_points: estimatePoints ? Number(estimatePoints) : null,
                tags: parsedTags,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            setError(result.error ?? "Failed to create task");
            setSaving(false);
            return;
        }

        router.push(`/companies/s/${companySlug}/tasks/${result.task.id}`);
        router.refresh();
    }

    return (
        <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.formRow}>
                <div className={styles.field}>
                    <label htmlFor="workspace_id">Workspace</label>
                    <select
                        id="workspace_id"
                        value={workspaceId}
                        onChange={(event) => onWorkspaceChange(event.target.value)}
                        required
                    >
                        {workspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                                {workspace.name} ({workspace.status})
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.field}>
                    <label htmlFor="list_id">List</label>
                    <select
                        id="list_id"
                        value={listId}
                        onChange={(event) => setListId(event.target.value)}
                        required
                    >
                        {filteredLists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={styles.field}>
                <label htmlFor="title">Task title</label>
                <input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                    placeholder="Ex: Build release checklist for v1"
                    required
                />
            </div>

            <div className={styles.field}>
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={4000}
                    placeholder="Include context, acceptance criteria, links, and implementation notes"
                />
            </div>

            <div className={styles.formRowThirds}>
                <div className={styles.field}>
                    <label htmlFor="priority">Priority</label>
                    <select id="priority" value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                <div className={styles.field}>
                    <label htmlFor="status">Status</label>
                    <select id="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                        <option value="todo">Todo</option>
                        <option value="in_progress">In progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="review">In review</option>
                        <option value="done">Done</option>
                    </select>
                </div>

                <div className={styles.field}>
                    <label htmlFor="due_date">Due date</label>
                    <input id="due_date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.field}>
                    <label htmlFor="estimate_points">Estimate points</label>
                    <input
                        id="estimate_points"
                        type="number"
                        min={0}
                        max={500}
                        value={estimatePoints}
                        onChange={(event) => setEstimatePoints(event.target.value)}
                        placeholder="e.g. 5"
                    />
                </div>

                <div className={styles.field}>
                    <label htmlFor="tags">Tags</label>
                    <input
                        id="tags"
                        value={tags}
                        onChange={(event) => setTags(event.target.value)}
                        placeholder="frontend, release, urgent"
                    />
                    <p className={styles.helpText}>Comma-separated labels, up to 12 tags.</p>
                </div>
            </div>

            {error && <p className={styles.errorText}>{error}</p>}

            <div className={styles.actionsRow}>
                <button className={styles.primaryBtn} type="submit" disabled={saving || !workspaceId || !listId}>
                    {saving ? "Creating..." : "Create task"}
                </button>
            </div>
        </form>
    );
}
