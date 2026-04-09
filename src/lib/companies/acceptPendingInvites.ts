import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AppSupabaseClient = SupabaseClient<Database>;

export async function acceptPendingInvitesForUser(
    supabase: AppSupabaseClient,
    user: Pick<User, "id" | "email">
) {
    const normalizedEmail = user.email?.trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: pendingInvites } = await supabase
        .from("company_invites")
        .select("id, company_id, role")
        .eq("invited_email", normalizedEmail)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

    if (!pendingInvites || pendingInvites.length === 0) return;

    const companyIds = [...new Set(pendingInvites.map((invite) => invite.company_id))];

    const { data: existingMemberships } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .in("company_id", companyIds);

    const existingCompanyIds = new Set((existingMemberships ?? []).map((membership) => membership.company_id));

    const membershipsToInsert = pendingInvites
        .filter((invite) => !existingCompanyIds.has(invite.company_id))
        .map((invite) => ({
            company_id: invite.company_id,
            user_id: user.id,
            role: invite.role,
        }));

    if (membershipsToInsert.length === 0) {
        return;
    }

    await supabase.from("company_members").insert(membershipsToInsert);

    const insertedCompanyIds = new Set(membershipsToInsert.map((entry) => entry.company_id));

    const acceptedInviteIds = pendingInvites
        .filter((invite) => insertedCompanyIds.has(invite.company_id))
        .map((invite) => invite.id);

    if (acceptedInviteIds.length > 0) {
        await supabase
            .from("company_invites")
            .update({
                status: "accepted",
                accepted_at: new Date().toISOString(),
                accepted_by_user_id: user.id,
                updated_at: new Date().toISOString(),
            })
            .in("id", acceptedInviteIds)
            .eq("status", "pending");
    }
}
