export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">ResearVia</p>
      <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl">
        Research opportunities should be discoverable by every student.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
        A free academic platform for discovering professors, universities, scholarships and research opportunities, managing applications, and organizing outreach.
      </p>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold">New production rebuild is underway.</p>
        <p className="mt-2 text-slate-600">Single Next.js codebase, MongoDB data layer, secure student-first architecture, and no billing system.</p>
      </div>
    </main>
  );
}
