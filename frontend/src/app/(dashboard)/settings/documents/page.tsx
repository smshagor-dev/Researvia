'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/lib/api';
import { useStudentProfile } from '@/lib/hooks';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';

const documentTypes = ['CV', 'TRANSCRIPT', 'PASSPORT', 'SOP', 'RESEARCH_PROPOSAL', 'RECOMMENDATION_LETTER', 'CERTIFICATE', 'OTHER'];

export default function DocumentsSettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useStudentProfile();
  const documents = (data as any)?.profile?.documents || [];
  const [type, setType] = useState('CV');
  const [busy, setBusy] = useState(false);

  const upload = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      await studentApi.uploadDocument(type, file);
      await qc.invalidateQueries({ queryKey: ['student-profile'] });
      await qc.invalidateQueries({ queryKey: ['student-completeness'] });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await studentApi.deleteDocument(id);
      await qc.invalidateQueries({ queryKey: ['student-profile'] });
      await qc.invalidateQueries({ queryKey: ['student-completeness'] });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="mx-auto w-full max-w-[1680px] px-6 py-6 xl:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          <FileText className="h-6 w-6 text-blue-500" />
          Documents
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Upload private academic documents. CV is recommended but not required to continue.</p>
      </div>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Document Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              {documentTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Choose file
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Uploaded Documents</h2>
        <div className="space-y-3">
          {documents.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">No documents uploaded yet.</p>}
          {documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{doc.originalName}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{doc.type} • {doc.status}</p>
              </div>
              <button onClick={() => remove(doc.id)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-slate-700 dark:text-slate-300">
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
