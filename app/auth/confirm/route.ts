import { createServerClient } from '@/lib/supabase/client';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Validate required parameters
  if (!token_hash || !type) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_token', requestUrl.origin)
    );
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Verify email using the token hash
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (error) {
      console.error('Email verification error:', error);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin
        )
      );
    }

    // Email verified successfully - redirect to dashboard or specified next URL
    return NextResponse.redirect(
      new URL(next, requestUrl.origin)
    );
  } catch (error) {
    console.error('Unexpected error during email verification:', error);
    return NextResponse.redirect(
      new URL(
        '/login?error=verification_failed',
        requestUrl.origin
      )
    );
  }
}
