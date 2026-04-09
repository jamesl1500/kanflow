import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { UpdateTaskSchema } from "@/lib/schemas/tasks/TaskForm";
import type { TablesUpdate } from "@/types/database";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = UpdateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const { id, company_slug, ...updates } = parsed.data;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", company_slug)
        .maybeSingle();

    if (!company) {
        return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabase
        .from("kanban_cards")
        .select("id, workspace_id")
        .eq("id", id)
        .maybeSingle();

    if (!existing) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: existingWorkspace } = await supabase
        .from("workspaces")
        .select("id, company_id")
        .eq("id", existing.workspace_id)
        .maybeSingle();

    if (!existingWorkspace || existingWorkspace.company_id !== company.id) {
        return NextResponse.json({ error: "Task does not belong to this company" }, { status: 403 });
    }

    const nextWorkspaceId = updates.workspace_id ?? existing.workspace_id;

    if (updates.workspace_id) {
        const { data: workspace } = await supabase
            .from("workspaces")
            .select("id, company_id")
            .eq("id", updates.workspace_id)
            .maybeSingle();

        if (!workspace || workspace.company_id !== company.id) {
            return NextResponse.json({ error: "Selected workspace is invalid" }, { status: 400 });
        }
    }

    if (updates.list_id) {
        const { data: list } = await supabase
            .from("kanban_lists")
            .select("id, workspace_id")
            .eq("id", updates.list_id)
            .maybeSingle();

        if (!list || list.workspace_id !== nextWorkspaceId) {
            return NextResponse.json({ error: "Selected list is invalid for the workspace" }, { status: 400 });
        }
    }

    const normalized: TablesUpdate<"kanban_cards"> = {
        ...updates,
        description: updates.description === undefined ? undefined : updates.description ?? null,
        due_date: updates.due_date === undefined ? undefined : updates.due_date ?? null,
        estimate_points: updates.estimate_points === undefined ? undefined : updates.estimate_points ?? null,
        updated_at: new Date().toISOString(),
    };

    if (normalized.status === "done") {
        normalized.completed_at = new Date().toISOString();
        if (!normalized.started_at) {
            normalized.started_at = new Date().toISOString();
        }
    }

    if (normalized.status === "in_progress" && !normalized.started_at) {
        normalized.started_at = new Date().toISOString();
    }

    if (normalized.status && normalized.status !== "done") {
        normalized.completed_at = null;
    }

    const { data: task, error: updateError } = await supabase
        .from("kanban_cards")
        .update(normalized)
        .eq("id", id)
        .select("id")
        .single();

    if (updateError || !task) {
        return NextResponse.json({ error: updateError?.message ?? "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ success: true, task });
}
