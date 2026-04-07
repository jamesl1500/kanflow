'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/types/database";
import styles from "@/styles/pages/companies/tasks.module.scss";

type Workspace = Tables<"workspaces">;
type KanbanList = Tables<"kanban_lists">;
type KanbanCard = Tables<"kanban_cards">;
type KanbanSubtask = Tables<"kanban_subtasks">;

interface TaskDetailsClientProps {
    companySlug: string;
    workspaces: Pick<Workspace, "id" | "name">[];
    lists: Pick<KanbanList, "id" | "workspace_id" | "name">[];
    task: Pick<KanbanCard, "id" | "title" | "description" | "priority" | "status" | "due_date" | "estimate_points" | "workspace_id" | "list_id" | "tags">;
    subtasks: Pick<KanbanSubtask, "id" | "title" | "is_completed" | "due_date" | "position">[];
}

export default function TaskDetailsClient({ companySlug, workspaces, lists, task, subtasks: initialSubtasks }: TaskDetailsClientProps) {
    const router = useRouter();
    const [workspaceId, setWorkspaceId] = useState(task.workspace_id);
    const [listId, setListId] = useState(task.list_id);
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const [priority, setPriority] = useState(task.priority);
    const [status, setStatus] = useState(task.status);
    const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : "");
    const [estimatePoints, setEstimatePoints] = useState(task.estimate_points?.toString() ?? "");
    const [tags, setTags] = useState((task.tags ?? []).join(", "));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [subtasks, setSubtasks] = useState(initialSubtasks);
    const [newSubtask, setNewSubtask] = useState("");
    const [newSubtaskDueDate, setNewSubtaskDueDate] = useState("");
    const [subtaskError, setSubtaskError] = useState<string | null>(null);
    const [subtaskLoading, setSubtaskLoading] = useState(false);

    const workspaceLists = useMemo(
        () => lists.filter((list) => list.workspace_id === workspaceId),
        [lists, workspaceId]
    );

    function getStatusClass(value: string) {
        if (value === "blocked") return styles.statusBlocked;
        if (value === "review") return styles.statusReview;
        if (value === "done") return styles.statusDone;
        if (value === "in_progress") return styles.statusInProgress;
        return styles.statusTodo;
    }

    async function saveTask(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(null);

        const response = await fetch("/api/companies/tasks/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: task.id,
                company_slug: companySlug,
                workspace_id: workspaceId,
                list_id: listId,
                title,
                description,
                priority,
                status,
                due_date: dueDate || null,
                estimate_points: estimatePoints ? Number(estimatePoints) : null,
                tags: tags.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).slice(0, 12),
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            setError(result.error ?? "Failed to update task");
            setSaving(false);
            return;
        }

        setSaving(false);
        router.refresh();
    }

    async function deleteTask() {
        if (!confirm("Delete this task and all subtasks? This cannot be undone.")) return;

        setDeleting(true);

        const response = await fetch("/api/companies/tasks/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: task.id, company_slug: companySlug }),
        });

        const result = await response.json();

        if (!response.ok) {
            setError(result.error ?? "Failed to delete task");
            setDeleting(false);
            return;
        }

        router.push(`/companies/s/${companySlug}/tasks`);
        router.refresh();
    }

    async function addSubtask(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!newSubtask.trim()) return;

        setSubtaskLoading(true);
        setSubtaskError(null);

        const response = await fetch("/api/companies/tasks/subtasks/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                company_slug: companySlug,
                card_id: task.id,
                title: newSubtask,
                due_date: newSubtaskDueDate || null,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            setSubtaskError(result.error ?? "Failed to add subtask");
            setSubtaskLoading(false);
            return;
        }

        setSubtasks((prev) => [...prev, result.subtask]);
        setNewSubtask("");
        setNewSubtaskDueDate("");
        setSubtaskLoading(false);
    }

    async function toggleSubtask(id: string, nextValue: boolean) {
        const previous = subtasks;
        setSubtasks((prev) => prev.map((subtask) => subtask.id === id ? { ...subtask, is_completed: nextValue } : subtask));

        const response = await fetch("/api/companies/tasks/subtasks/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, company_slug: companySlug, is_completed: nextValue }),
        });

        if (!response.ok) {
            setSubtasks(previous);
            const result = await response.json();
            setSubtaskError(result.error ?? "Failed to update subtask");
        }
    }

    async function removeSubtask(id: string) {
        const previous = subtasks;
        setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));

        const response = await fetch("/api/companies/tasks/subtasks/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, company_slug: companySlug }),
        });

        if (!response.ok) {
            setSubtasks(previous);
            const result = await response.json();
            setSubtaskError(result.error ?? "Failed to delete subtask");
        }
    }

    const completedCount = subtasks.filter((subtask) => subtask.is_completed).length;

    return (
        <div className={styles.split}>
            <form className={styles.form} onSubmit={saveTask}>
                <div className={styles.panelHeader}>
                    <h2>Edit task</h2>
                    <span className={`${styles.badge} ${getStatusClass(status)}`}>{status.replace("_", " ")}</span>
                </div>

                <div className={styles.field}>
                    <label htmlFor="title">Title</label>
                    <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={200} />
                </div>

                <div className={styles.field}>
                    <label htmlFor="description">Description</label>
                    <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={4000} />
                </div>

                <div className={styles.formRow}>
                    <div className={styles.field}>
                        <label htmlFor="workspace">Workspace</label>
                        <select
                            id="workspace"
                            value={workspaceId}
                            onChange={(event) => {
                                const nextWorkspace = event.target.value;
                                setWorkspaceId(nextWorkspace);
                                const nextLists = lists.filter((list) => list.workspace_id === nextWorkspace);
                                if (!nextLists.find((list) => list.id === listId)) {
                                    setListId(nextLists[0]?.id ?? "");
                                }
                            }}
                        >
                            {workspaces.map((workspace) => (
                                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="list">List</label>
                        <select id="list" value={listId} onChange={(event) => setListId(event.target.value)}>
                            {workspaceLists.map((list) => (
                                <option key={list.id} value={list.id}>{list.name}</option>
                            ))}
                        </select>
                    </div>
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
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="tags">Tags</label>
                        <input
                            id="tags"
                            value={tags}
                            onChange={(event) => setTags(event.target.value)}
                            placeholder="design, sprint-3"
                        />
                    </div>
                </div>

                {error && <p className={styles.errorText}>{error}</p>}

                <div className={styles.actionsRow}>
                    <button className={styles.primaryBtn} type="submit" disabled={saving || !title.trim()}>
                        {saving ? "Saving..." : "Save task"}
                    </button>
                    <button className={styles.dangerBtn} type="button" onClick={deleteTask} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete task"}
                    </button>
                </div>
            </form>

            <section className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2>Subtasks</h2>
                    <span>{completedCount}/{subtasks.length} completed</span>
                </div>

                <form className={styles.form} onSubmit={addSubtask}>
                    <div className={styles.field}>
                        <label htmlFor="new_subtask">New subtask</label>
                        <input
                            id="new_subtask"
                            value={newSubtask}
                            onChange={(event) => setNewSubtask(event.target.value)}
                            placeholder="Write migration test case"
                            maxLength={200}
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="new_subtask_due">Due date (optional)</label>
                        <input
                            id="new_subtask_due"
                            type="date"
                            value={newSubtaskDueDate}
                            onChange={(event) => setNewSubtaskDueDate(event.target.value)}
                        />
                    </div>

                    <button className={styles.secondaryBtn} type="submit" disabled={subtaskLoading || !newSubtask.trim()}>
                        {subtaskLoading ? "Adding..." : "Add subtask"}
                    </button>
                </form>

                {subtaskError && <p className={styles.errorText}>{subtaskError}</p>}

                {subtasks.length === 0 ? (
                    <p className={styles.empty}>No subtasks yet.</p>
                ) : (
                    <ul className={styles.subtaskList}>
                        {[...subtasks]
                            .sort((a, b) => a.position - b.position)
                            .map((subtask) => (
                                <li key={subtask.id} className={styles.subtaskItem}>
                                    <div className={styles.subtaskLeft}>
                                        <input
                                            type="checkbox"
                                            checked={subtask.is_completed}
                                            onChange={(event) => toggleSubtask(subtask.id, event.target.checked)}
                                        />
                                        <div>
                                            <p className={`${styles.subtaskTitle}${subtask.is_completed ? ` ${styles.subtaskDone}` : ""}`}>
                                                {subtask.title}
                                            </p>
                                            {subtask.due_date && (
                                                <span className={styles.subtaskMeta}>
                                                    Due {new Date(subtask.due_date).toLocaleDateString("en-US")}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button className={styles.inlineBtn} type="button" onClick={() => removeSubtask(subtask.id)}>
                                        Remove
                                    </button>
                                </li>
                            ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
