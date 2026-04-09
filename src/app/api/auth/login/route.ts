import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { acceptPendingInvitesForUser } from "@/lib/companies/acceptPendingInvites"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = LoginSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { email, password } = parsed.data

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!data.user) {
    return NextResponse.json({ error: "Unable to resolve authenticated user" }, { status: 500 })
  }

  await acceptPendingInvitesForUser(supabase, {
    id: data.user.id,
    email: data.user.email,
  })

  // Determine where to send the user based on onboarding progress
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_status, onboarding_step")
    .eq("id", data.user.id)
    .single()

  if (!profile || profile.onboarding_status === "pending") {
    return NextResponse.json({ redirect: "/onboarding/username" })
  }

  if (profile.onboarding_status === "in_progress") {
    return NextResponse.json({ redirect: "/onboarding/profile" })
  }

  return NextResponse.json({ redirect: "/dashboard" })
}
