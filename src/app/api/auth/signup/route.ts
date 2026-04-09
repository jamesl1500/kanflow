import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { createClient } from "@/utils/supabase/server"
import { acceptPendingInvitesForUser } from "@/lib/companies/acceptPendingInvites"

const SignupSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = SignupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { firstName, lastName, email, password } = parsed.data

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "/api/auth/verify-email",
      data: { first_name: firstName, last_name: lastName },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Email confirmation required — user has no active session yet
  if (!data.session || !data.user) {
    return NextResponse.json({ requiresConfirmation: true })
  }

  await acceptPendingInvitesForUser(supabase, {
    id: data.user.id,
    email: data.user.email,
  })

  return NextResponse.json({ redirect: "/onboarding/username" })
}
