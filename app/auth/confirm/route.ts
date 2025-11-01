import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/database';

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
    const cookieStore = cookies();

    // Supabase 클라이언트 생성 (SSR 지원)
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

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
