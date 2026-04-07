import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { CreateTaskSchema } from "@/lib/schemas/tasks/TaskForm";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = CreateTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const body = parsed.data;

    const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", body.company_slug)
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

    const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, company_id")
        .eq("id", body.workspace_id)
        .maybeSingle();

    if (!workspace || workspace.company_id !== company.id) {
        return NextResponse.json({ error: "Workspace not found in this company" }, { status: 400 });
    }

    const { data: list } = await supabase
        .from("kanban_lists")
        .select("id, workspace_id")
        .eq("id", body.list_id)
        .maybeSingle();

    if (!list || list.workspace_id !== body.workspace_id) {
        return NextResponse.json({ error: "List not found in the selected workspace" }, { status: 400 });
    }

    const { count } = await supabase
        .from("kanban_cards")
        .select("id", { count: "exact", head: true })
        .eq("list_id", body.list_id);

    const { data: task, error: insertError } = await supabase
        .from("kanban_cards")
        .insert({
            workspace_id: body.workspace_id,
            list_id: body.list_id,
            title: body.title,
            description: body.description || null,
            priority: body.priority,
            status: body.status,
            due_date: body.due_date ?? null,
            estimate_points: body.estimate_points ?? null,
            tags: body.tags,
            position: count ?? 0,
        })
        .select("id")
        .single();

    if (insertError || !task) {
        return NextResponse.json({ error: insertError?.message ?? "Failed to create task" }, { status: 500 });
    }

    return NextResponse.json({ success: true, task }, { status: 201 });
}
