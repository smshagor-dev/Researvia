'use client';

import { useState } from 'react';
import { useEmailThreads, useEmailThread } from '@/lib/hooks';
import { emailThreadsApi, emailAccountsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail, Plus, Send, ChevronLeft, Loader2, Paperclip,
  Clock, CheckCheck, AlertCircle, Reply, RefreshCw, Inbox,
} from 'lucide-react';
import { cn, formatRelativeTime, truncate } from '@/lib/utils';

type Status = 'draft' | 'sent' | 'replied' | 'bounced' | 'all';

export default function InboxPage() {
  const qc = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<Status>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  const threadsQuery = useEmailThreads(selectedStatus !== 'all' ? { status: selectedStatus } : undefined);
  const threadQuery = useEmailThread(selectedThreadId || '');

  const threads = (threadsQuery.data as any)?.data || [];
  const thread = threadQuery.data as any;
  const messages = thread?.messages || [];

  const { data: emailAccounts } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: emailAccountsApi.list,
  });
  const accounts = (emailAccounts as any[] || []).filter((account) => account.isActive && account.mailboxStatus === 'active');

  const statusTabs: { key: Status; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Drafts' },
    { key: 'sent', label: 'Sent' },
    { key: 'replied', label: 'Replied' },
    { key: 'bounced', label: 'Bounced' },
  ];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'replied': return <Reply className="w-3.5 h-3.5 text-green-500" />;
      case 'bounced': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'draft': return <Clock className="w-3.5 h-3.5 text-gray-400" />;
      default: return <Mail className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject || !composeData.body) return;
    if (accounts.length === 0) {
      alert('Please add an email account in Settings → Email Accounts first');
      return;
    }

    setSending(true);
    try {
      // Create thread first
      const threadRes = await emailThreadsApi.create({
        subject: composeData.subject,
        accountType: accounts[0]?.type?.toLowerCase(),
        accountId: accounts[0]?.id,
      });

      await emailThreadsApi.sendMessage(threadRes.id, {
        toEmails: [composeData.to],
        subject: composeData.subject,
        bodyHtml: `<p>${composeData.body.replace(/\n/g, '</p><p>')}</p>`,
        bodyText: composeData.body,
      });

      setComposing(false);
      setComposeData({ to: '', subject: '', body: '' });
      qc.invalidateQueries({ queryKey: ['email-threads'] });
    } catch (e: any) {
      alert(e.response?.data?.error?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-blue-600" />
          <h1 className="font-bold text-gray-900">Email CRM</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['email-threads'] })}
            className="p-2 rounded-lg hover:bg-gray-100 transition">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setComposing(true)}
            className="px-4 py-2 gradient-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition flex items-center gap-2">
            <Plus className="w-4 h-4" /> Compose
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Thread list panel */}
        <div className={cn('w-80 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col', selectedThreadId && 'hidden sm:flex')}>
          {/* Status tabs */}
          <div className="flex gap-1 p-3 border-b border-gray-100 overflow-x-auto">
            {statusTabs.map(({ key, label }) => (
              <button key={key} onClick={() => setSelectedStatus(key)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition',
                  selectedStatus === key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100')}>
                {label}
              </button>
            ))}
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {threadsQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-2">No emails yet</p>
                <button onClick={() => setComposing(true)}
                  className="text-sm text-blue-600 hover:text-blue-700">
                  Compose your first email
                </button>
              </div>
            ) : (
              threads.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedThreadId(t.id)}
                  className={cn('w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition',
                    selectedThreadId === t.id && 'bg-blue-50 border-l-2 border-l-blue-600')}>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {t.professor?.fullName?.[0] || t.subject?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {t.professor?.fullName || 'External'}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {statusIcon(t.status)}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600 truncate">{t.subject}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {t.messages?.[0]?.bodyText ? truncate(t.messages[0].bodyText, 60) : 'No messages'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded capitalize font-medium',
                          t.status === 'replied' ? 'text-green-600 bg-green-50' :
                          t.status === 'sent' ? 'text-blue-600 bg-blue-50' :
                          t.status === 'bounced' ? 'text-red-600 bg-red-50' :
                          'text-gray-500 bg-gray-100')}>
                          {t.status}
                        </span>
                        {t.lastMessageAt && (
                          <span className="text-xs text-gray-300">{formatRelativeTime(t.lastMessageAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message view */}
        <div className={cn('flex-1 flex flex-col bg-gray-50', !selectedThreadId && 'hidden sm:flex')}>
          {selectedThreadId ? (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setSelectedThreadId(null)} className="sm:hidden p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {threadQuery.isLoading ? (
                  <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <div>
                    <h2 className="font-semibold text-gray-900">{thread?.subject}</h2>
                    {thread?.professor && (
                      <p className="text-xs text-gray-400">{thread.professor.fullName} · {thread.professor.university?.name}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {threadQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">No messages in this thread</div>
                ) : (
                  messages.map((msg: any) => (
                    <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-2xl px-4 py-3',
                        msg.direction === 'outbound'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm')}>
                        <div className="text-sm leading-relaxed email-body whitespace-pre-wrap">
                          {msg.bodyText || 'No content'}
                        </div>
                        <div className={cn('flex items-center gap-2 mt-2 text-xs',
                          msg.direction === 'outbound' ? 'text-blue-200 justify-end' : 'text-gray-400')}>
                          <span>{msg.sentAt ? formatRelativeTime(msg.sentAt) : formatRelativeTime(msg.createdAt)}</span>
                          {msg.direction === 'outbound' && (
                            <span className="capitalize">{msg.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick reply box */}
              <div className="bg-white border-t border-gray-100 p-4 flex-shrink-0">
                <div className="flex gap-3">
                  <textarea
                    placeholder="Write a reply..."
                    className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  />
                  <button className="px-4 py-3 gradient-primary text-white rounded-xl hover:opacity-90 transition flex-shrink-0 flex flex-col items-center gap-1">
                    <Send className="w-4 h-4" />
                    <span className="text-xs">Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-600 mb-1">Select a conversation</h3>
                <p className="text-sm text-gray-400">Choose a thread from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">New Email</h3>
              <button onClick={() => setComposing(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {accounts.length === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                  ⚠️ No email accounts configured.{' '}
                  <a href="/settings/email-accounts" className="font-medium underline">Add one in Settings</a>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
                <input type="email" placeholder="professor@university.edu" value={composeData.to}
                  onChange={e => setComposeData(p => ({ ...p, to: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Subject</label>
                <input type="text" placeholder="PhD Application Inquiry" value={composeData.subject}
                  onChange={e => setComposeData(p => ({ ...p, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Message</label>
                <textarea value={composeData.body} onChange={e => setComposeData(p => ({ ...p, body: e.target.value }))}
                  placeholder="Dear Prof. Smith,&#10;&#10;I am writing to inquire..."
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setComposing(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSend} disabled={sending || !composeData.to || !composeData.subject}
                className="flex-1 py-2.5 gradient-primary text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 transition flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
