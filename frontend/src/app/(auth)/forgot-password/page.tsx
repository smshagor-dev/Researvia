'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import Link from 'next/link';
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ResearVia</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-700 mb-4">Check your email for reset instructions.</p>
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 gradient-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send Reset Link
              </button>
              <p className="text-center text-sm text-gray-500"><Link href="/login" className="text-blue-600 hover:text-blue-700">Back to Login</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
