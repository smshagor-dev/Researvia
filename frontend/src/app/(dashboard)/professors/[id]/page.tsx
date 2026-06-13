'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProfessor } from '@/lib/hooks';
import { aiApi } from '@/lib/api';
import { professorsApi, favoritesApi } from '@/lib/api';
import Link from 'next/link';
import {
  GraduationCap, ExternalLink, Mail, Star, BookOpen,
  BarChart3, Globe, Award, Loader2, ChevronLeft, Copy,
  Sparkles, Check,
} from 'lucide-react';
import { cn, POSITION_LABELS, ACCEPTING_LABELS, formatDate } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfessorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error } = useProfessor(id);
  const [activeTab, setActiveTab] = useState<'overview' | 'publications' | 'contact' | 'ai'>('overview');
  const [emails, setEmails] = useState<any[]>([]);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState('');
  const [saved, setSaved] = useState(false);
  const [aiEmail, setAiEmail] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [matchScore, setMatchScore] = useState<any>(null);

  const prof = data as any;

  const handleRevealEmail = async () => {
    setRevealLoading(true);
    setRevealError('');
    try {
      const result = await professorsApi.revealEmail(id);
      setEmails(result.emails || []);
      qc.invalidateQueries({ queryKey: ['credits'] });
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || 'Failed to reveal email';
      setRevealError(msg);
      if (e.response?.status === 401) router.push('/login');
    } finally {
      setRevealLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await favoritesApi.save(id);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['favorites'] });
    } catch {}
  };

  const handleGenerateEmail = async () => {
    setAiLoading(true);
    setAiEmail('');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
    const token = localStorage.getItem('access_token');

    try {
      const response = await fetch(`${API_URL}/ai/generate-outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ professorId: id, tone: 'formal', wordLimit: 250 }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'));
        for (const line of lines) {
          const data = line.slice(5).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              setAiEmail(fullText);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('401')) router.push('/login');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGetMatchScore = async () => {
    try {
      const score = await aiApi.getMatchScore(id).catch(() => null);
      setMatchScore(score);
    } catch {}
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(aiEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !prof) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Professor not found</p>
        <Link href="/professors" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">← Back to professors</Link>
      </div>
    );
  }

  const accepting = ACCEPTING_LABELS[prof.acceptingStudents] || ACCEPTING_LABELS.unknown;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link href="/professors" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to professors
      </Link>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {prof.fullName[0]}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{prof.fullName}</h1>
              <button onClick={handleSave} disabled={saved}
                className={cn('px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition',
                  saved ? 'bg-yellow-50 text-yellow-600 border border-yellow-200' : 'border border-gray-200 text-gray-600 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200')}>
                <Star className={cn('w-4 h-4', saved && 'fill-yellow-500 text-yellow-500')} />
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
            <p className="text-gray-500 mb-3">
              {POSITION_LABELS[prof.position] || 'Professor'} · {prof.university?.name}
              {prof.university?.country && ` · ${prof.university.country.flagEmoji} ${prof.university.country.name}`}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span className={cn('text-sm px-3 py-1 rounded-full border font-medium', accepting.color)}>
                {accepting.label}
              </span>
              {prof.fundingStatus === 'funded' && (
                <span className="text-sm px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                  💰 Funded
                </span>
              )}
            </div>

            <div className="flex gap-4">
              {prof.hIndex != null && (
                <div><p className="text-xl font-bold text-gray-900">{prof.hIndex}</p><p className="text-xs text-gray-400">h-index</p></div>
              )}
              {prof.citationsCount != null && (
                <div><p className="text-xl font-bold text-gray-900">{prof.citationsCount >= 1000 ? `${Math.round(prof.citationsCount/1000)}k` : prof.citationsCount}</p><p className="text-xs text-gray-400">citations</p></div>
              )}
              {prof.publicationsCount != null && (
                <div><p className="text-xl font-bold text-gray-900">{prof.publicationsCount}</p><p className="text-xs text-gray-400">papers</p></div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {prof.personalWebsite && (
                <a href={prof.personalWebsite} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
              {prof.googleScholarUrl && (
                <a href={prof.googleScholarUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
                  <BarChart3 className="w-3.5 h-3.5" /> Google Scholar
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {(['overview', 'publications', 'contact', 'ai'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition capitalize',
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {tab === 'ai' ? '✨ AI Tools' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {prof.bio && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Biography</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{prof.bio}</p>
            </div>
          )}
          {prof.researchAreas?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Research Areas</h3>
              <div className="flex flex-wrap gap-2">
                {prof.researchAreas.map((ra: any) => (
                  <span key={ra.researchArea.id}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm font-medium">
                    {ra.researchArea.name}
                    {ra.score && <span className="ml-1 text-blue-400 text-xs">({Math.round(ra.score * 100)}%)</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'publications' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Publications ({prof.publications?.length || 0})</h3>
          <div className="space-y-4">
            {(prof.publications || []).slice(0, 20).map((pub: any) => (
              <div key={pub.id} className="p-4 border border-gray-100 rounded-lg hover:border-blue-200 transition">
                <p className="text-sm font-medium text-gray-900 mb-1">{pub.title}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  {pub.venue && <span>{pub.venue}</span>}
                  {pub.publicationYear && <span>{pub.publicationYear}</span>}
                  {pub.citationCount > 0 && <span className="text-blue-600 font-medium">{pub.citationCount} citations</span>}
                  {pub.doi && (
                    <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> DOI
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!prof.publications?.length && (
              <p className="text-sm text-gray-400 text-center py-8">No publications indexed yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" /> Contact Information
          </h3>
          {emails.length > 0 ? (
            <div className="space-y-3 mb-6">
              {emails.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{e.email}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{e.type} {e.isPrimary && '· Primary'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(e.email)}
                      className="p-2 hover:bg-green-100 rounded-lg transition">
                      <Copy className="w-4 h-4 text-green-600" />
                    </button>
                    <Link href={`/inbox?compose=${id}&email=${e.email}`}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                      Compose
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 mb-6">
              <Mail className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                Verified emails are available to members. Costs <strong>5 credits</strong> to reveal.
              </p>
              {revealError && (
                <p className="text-sm text-red-500 mb-3">{revealError}</p>
              )}
              <button onClick={handleRevealEmail} disabled={revealLoading}
                className="px-6 py-2.5 gradient-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition flex items-center gap-2 mx-auto">
                {revealLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Reveal Email (5 credits)
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* Match Score */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-500" /> Research Match Score
              </h3>
              {!matchScore && (
                <button onClick={handleGetMatchScore}
                  className="px-4 py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Calculate Match
                </button>
              )}
            </div>
            {matchScore ? (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${matchScore.score} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">{matchScore.score}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">{matchScore.explanation}</p>
                    <div className="space-y-2">
                      {Object.entries(matchScore.breakdown || {}).map(([key, val]: any) => (
                        <div key={key}>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="font-medium">{val}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Click Calculate Match to see your compatibility score based on research interests, funding status, and availability.</p>
            )}
          </div>

          {/* AI Email Generator */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" /> AI Email Generator
              </h3>
              <button onClick={handleGenerateEmail} disabled={aiLoading}
                className="px-4 py-2 gradient-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60 transition flex items-center gap-1.5">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'Generating...' : 'Generate (10 credits)'}
              </button>
            </div>
            {aiEmail && (
              <div className="relative">
                <pre className={cn('text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 font-sans leading-relaxed', aiLoading && 'ai-streaming')}>
                  {aiEmail}
                </pre>
                <button onClick={copyEmail}
                  className="absolute top-3 right-3 p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
            )}
            {!aiEmail && !aiLoading && (
              <p className="text-sm text-gray-400">Generate a personalized outreach email tailored to this professor's research interests and your academic background.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
