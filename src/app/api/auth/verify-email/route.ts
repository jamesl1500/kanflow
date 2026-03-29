import { EmailOtpType } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null

    const cookieStore = await cookies();

    if (token_hash && type) {
        const supabase = await createClient(cookieStore)

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            // Redirect to the success page (e.g., dashboard)
            return NextResponse.redirect(new URL('/verify-email?success=true', request.url))
        }
    }

    // Redirect to an error page if verification fails
    return NextResponse.redirect(new URL('/verify-email?success=false', request.url))
}