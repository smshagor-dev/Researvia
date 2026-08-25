import { UserAdminActions } from "@/components/admin/UserAdminActions";
import { listAdminUsers, requireAdmin } from "@/server/admin/admin.service";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q = "" } = await searchParams;
  const users = await listAdminUsers(q, 200);

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-medium text-slate-500">Access control</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Users</h1><p className="mt-2 text-sm text-slate-600">Search student and administrator accounts. Role and account-state changes require a super administrator.</p></div>
    <form className="flex max-w-xl gap-2"><input name="q" defaultValue={q} placeholder="Search by name or email" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"/><button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white">Search</button></form>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Role / status</th><th className="px-5 py-3">Verification</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Controls</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user._id.toString()} className="align-top"><td className="px-5 py-4"><p className="font-medium text-slate-950">{user.displayName}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></td><td className="px-5 py-4"><p className="font-medium text-slate-800">{user.role}</p><p className="mt-1 text-xs text-slate-500">{user.status}</p></td><td className="px-5 py-4 text-slate-600">{user.emailVerifiedAt ? "Verified" : "Unverified"}</td><td className="px-5 py-4 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><UserAdminActions userId={user._id.toString()} role={String(user.role)} status={String(user.status)} canManage={admin.role === "SUPER_ADMIN"}/></td></tr>)}</tbody></table></div>{users.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No users matched this search.</p> : null}</div>
  </div>;
}
