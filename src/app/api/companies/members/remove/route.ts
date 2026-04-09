import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { RemoveMemberSchema } from "@/lib/schemas/companies/MemberManagementForm";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = RemoveMemberSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { company_id, member_id } = parsed.data;

    const [{ data: actorMembership }, { data: targetMembership }] = await Promise.all([
        supabase
            .from("company_members")
            .select("id, user_id, role")
            .eq("company_id", company_id)
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("company_members")
            .select("id, user_id, role")
            .eq("company_id", company_id)
            .eq("id", member_id)
            .maybeSingle(),
    ]);

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
        return NextResponse.json({ error: "Only owners and admins can remove members." }, { status: 403 });
    }

    if (!targetMembership) {
        return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (targetMembership.user_id === user.id) {
        return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
    }

    if (targetMembership.role === "owner") {
        return NextResponse.json({ error: "Owner cannot be removed." }, { status: 400 });
    }

    if (actorMembership.role === "admin" && targetMembership.role === "admin") {
        return NextResponse.json({ error: "Admins cannot remove other admins." }, { status: 403 });
    }

    const { data: companyWorkspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("company_id", company_id);

    const workspaceIds = (companyWorkspaces ?? []).map((workspace) => workspace.id);

    if (workspaceIds.length > 0) {
        const { error: workspaceMemberDeleteError } = await supabase
            .from("workspace_members")
            .delete()
            .in("workspace_id", workspaceIds)
            .eq("user_id", targetMembership.user_id);

        if (workspaceMemberDeleteError) {
            // Non-fatal. Continue removing company membership.
            console.error("Failed to remove workspace memberships:", workspaceMemberDeleteError.message);
        }
    }

    const { error: deleteError } = await supabase
        .from("company_members")
        .delete()
        .eq("id", targetMembership.id)
        .eq("company_id", company_id);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
