import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { UpdateMemberSchema } from "@/lib/schemas/companies/MemberManagementForm";

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
    const parsed = UpdateMemberSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { company_id, member_id, role } = parsed.data;

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
        return NextResponse.json({ error: "Only owners and admins can edit members." }, { status: 403 });
    }

    if (!targetMembership) {
        return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (targetMembership.role === "owner") {
        return NextResponse.json({ error: "Owner role cannot be changed here." }, { status: 400 });
    }

    if (targetMembership.user_id === user.id) {
        return NextResponse.json({ error: "You cannot change your own role from this screen." }, { status: 400 });
    }

    if (actorMembership.role === "admin" && targetMembership.role === "admin") {
        return NextResponse.json({ error: "Admins cannot edit other admins." }, { status: 403 });
    }

    const { data: updatedMembership, error: updateError } = await supabase
        .from("company_members")
        .update({ role })
        .eq("id", targetMembership.id)
        .eq("company_id", company_id)
        .select("id, user_id, role, joined_at")
        .single();

    if (updateError || !updatedMembership) {
        return NextResponse.json(
            { error: updateError?.message ?? "Failed to update member role." },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true, member: updatedMembership });
}
