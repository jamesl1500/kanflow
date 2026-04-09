import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { InviteMemberSchema } from "@/lib/schemas/companies/InviteMemberForm";
import { Resend } from "resend";

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
    const parsed = InviteMemberSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { company_id, role } = parsed.data;

    const { data: actorMembership } = await supabase
        .from("company_members")
        .select("role")
        .eq("company_id", company_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!actorMembership || !["owner", "admin"].includes(actorMembership.role)) {
        return NextResponse.json({ error: "Only owners and admins can invite members." }, { status: 403 });
    }

    if (parsed.data.invite_method === "username") {
        const { user_name } = parsed.data;

        const { data: targetProfile } = await supabase
            .from("profiles")
            .select("id, user_name")
            .eq("user_name", user_name)
            .maybeSingle();

        if (!targetProfile) {
            return NextResponse.json(
                { error: "No profile found for that username." },
                { status: 404 }
            );
        }

        const { data: existingMembership } = await supabase
            .from("company_members")
            .select("id")
            .eq("company_id", company_id)
            .eq("user_id", targetProfile.id)
            .maybeSingle();

        if (existingMembership) {
            return NextResponse.json(
                { error: "That user is already a member of this company." },
                { status: 409 }
            );
        }

        const { data: insertedMembership, error: insertError } = await supabase
            .from("company_members")
            .insert({
                company_id,
                user_id: targetProfile.id,
                role,
            })
            .select("id, user_id, role, joined_at")
            .single();

        if (insertError || !insertedMembership) {
            return NextResponse.json(
                { error: insertError?.message ?? "Failed to invite member" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                invite_method: "username",
                member: {
                    id: insertedMembership.id,
                    user_id: insertedMembership.user_id,
                    role: insertedMembership.role,
                    joined_at: insertedMembership.joined_at,
                    user_name: targetProfile.user_name,
                },
            },
            { status: 201 }
        );
    }

    const { email } = parsed.data;

    const { data: existingPendingInvite } = await supabase
        .from("company_invites")
        .select("id")
        .eq("company_id", company_id)
        .eq("invited_email", email)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

    if (existingPendingInvite) {
        return NextResponse.json(
            { error: "A pending invite already exists for this email." },
            { status: 409 }
        );
    }

    const { data: insertedInvite, error: inviteError } = await supabase
        .from("company_invites")
        .insert({
            company_id,
            invited_email: email,
            invited_by_user_id: user.id,
            role,
            status: "pending",
        })
        .select("id, invited_email, role, invite_token")
        .single();

    if (inviteError || !insertedInvite) {
        return NextResponse.json(
            { error: inviteError?.message ?? "Failed to create email invite" },
            { status: 500 }
        );
    }

    // Initiate resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const inviteSignupPath = `/signup?invite=${insertedInvite.invite_token}&email=${encodeURIComponent(insertedInvite.invited_email)}`;

    const resendEmailKey = process.env.RESEND_EMAIL_KEY;
    if (resendEmailKey) {
        const resend = new Resend(resendEmailKey);

        try {
            await resend.emails.send({
                from: "Kanbanflo Team <team@kanbanflo.com>",
                to: insertedInvite.invited_email,
                subject: "You're invited to join Kanbanflo!",
                html: `<p>You've been invited to join Kanbanflo. Click <a href="${appUrl ? `${appUrl}${inviteSignupPath}` : inviteSignupPath}">here</a> to accept the invite.</p>`,
            });
        } catch (error) {
            console.error("Failed to send invite email:", error);
        }
    }

    return NextResponse.json(
        {
            success: true,
            invite_method: "email",
            invite: insertedInvite,
            signup_url: appUrl ? `${appUrl}${inviteSignupPath}` : inviteSignupPath,
            message: "Invite sent! If the email doesn't arrive shortly, please ask the recipient to check their spam folder.",
        },
        { status: 201 }
    );
}
