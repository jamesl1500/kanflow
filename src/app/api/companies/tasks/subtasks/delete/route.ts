import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DeleteSubtaskSchema } from "@/lib/schemas/tasks/SubtaskForm";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = DeleteSubtaskSchema.safeParse(await request.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }

    const { id, company_slug } = parsed.data;

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

    const { data: subtask } = await supabase
        .from("kanban_subtasks")
        .select("id, card_id")
        .eq("id", id)
        .maybeSingle();

    if (!subtask) {
        return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const { data: card } = await supabase
        .from("kanban_cards")
        .select("id, workspace_id")
        .eq("id", subtask.card_id)
        .maybeSingle();

    if (!card) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, company_id")
        .eq("id", card.workspace_id)
        .maybeSingle();

    if (!workspace || workspace.company_id !== company.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
        .from("kanban_subtasks")
        .delete()
        .eq("id", id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
