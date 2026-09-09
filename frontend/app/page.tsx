'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both Email ID and Password');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (res?.error) {
        toast.error('Invalid credentials. Please try again.');
      } else {
        toast.success('Logged in successfully!');
        router.push('/dashboard');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoogleLogin() {
    setGoogleLoading(true);
    signIn('google', { callbackUrl: '/dashboard' });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4 font-sans text-[#111827]">
      {/* Login Card */}
      <div className="w-full max-w-[420px] rounded-2xl border border-[#e5e7eb] bg-white p-8 sm:p-10 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)]">
        {/* Title */}
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#111827]">
          Login
        </h1>

        {/* Login with Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || status === 'loading'}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#e6f4ea] px-4 text-sm font-medium text-[#1f2937] transition-colors hover:bg-[#d8eedd] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1f2937] border-t-transparent" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>Login with Google</span>
        </button>

        {/* Divider */}

        <div className="my-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="shrink-0 bg-white px-2 text-xs font-medium text-gray-400">
            or sign up through email
          </span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>



        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
          <div>
            <input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-transparent bg-[#f2f5f3] px-4 text-sm text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#00a651] focus:bg-white focus:ring-2 focus:ring-[#00a651]/20"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 w-full rounded-xl border border-transparent bg-[#f2f5f3] px-4 text-sm text-[#111827] placeholder:text-[#9ca3af] outline-none transition-all focus:border-[#00a651] focus:bg-white focus:ring-2 focus:ring-[#00a651]/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#00a651] px-4 text-sm font-medium text-white transition-all hover:bg-[#009245] active:bg-[#00823c] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
