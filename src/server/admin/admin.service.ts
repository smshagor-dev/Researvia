import { connectDatabase } from "@/server/db/mongoose";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors/AppError";
import { AuditLog } from "@/server/models/AuditLog";
import { Job } from "@/server/models/Job";
import { Opportunity } from "@/server/models/Opportunity";
import { Professor } from "@/server/models/Professor";
import { Scholarship } from "@/server/models/Scholarship";
import { University } from "@/server/models/University";
import { User } from "@/server/models/User";
import { Application } from "@/server/models/Application";

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHORIZED", 401, "Sign in is required.");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", 403, "Administrator access is required.");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (user.role !== "SUPER_ADMIN") throw new AppError("FORBIDDEN", 403, "Super administrator access is required.");
  return user;
}

export async function writeAudit(input: { actorUserId: string; action: string; targetType: string; targetId?: string | null; metadata?: Record<string, unknown>; ipAddress?: string | null }) {
  await connectDatabase();
  return AuditLog.create({ actorUserId: input.actorUserId, action: input.action, targetType: input.targetType, targetId: input.targetId ?? null, metadata: input.metadata ?? {}, ipAddress: input.ipAddress ?? null });
}

export async function adminOverview() {
  await connectDatabase();
  const [users, professors, universities, scholarships, opportunities, applications, pendingJobs, failedJobs] = await Promise.all([
    User.countDocuments({ status: { $ne: "DELETED" } }),
    Professor.countDocuments(),
    University.countDocuments(),
    Scholarship.countDocuments(),
    Opportunity.countDocuments(),
    Application.countDocuments(),
    Job.countDocuments({ status: { $in: ["PENDING", "RETRYING", "PROCESSING"] } }),
    Job.countDocuments({ status: "FAILED" })
  ]);
  return { users, professors, universities, scholarships, opportunities, applications, pendingJobs, failedJobs };
}

export async function listAdminUsers(query = "", limit = 100) {
  await connectDatabase();
  const filter = query.trim() ? { $or: [{ email: { $regex: query.trim(), $options: "i" } }, { displayName: { $regex: query.trim(), $options: "i" } }] } : {};
  return User.find(filter).select("email displayName role status emailVerifiedAt lastLoginAt createdAt").sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
}

export async function updateUserBySuperAdmin(actorUserId: string, targetUserId: string, input: { role?: "STUDENT" | "ADMIN" | "SUPER_ADMIN"; status?: "ACTIVE" | "SUSPENDED" | "DELETED" }) {
  await connectDatabase();
  if (actorUserId === targetUserId && input.status && input.status !== "ACTIVE") throw new AppError("SELF_LOCKOUT_BLOCKED", 400, "You cannot suspend or delete your own administrator account.");
  const update: Record<string, unknown> = {};
  if (input.role) update.role = input.role;
  if (input.status) update.status = input.status;
  const user = await User.findByIdAndUpdate(targetUserId, { $set: update }, { new: true }).select("email displayName role status").lean();
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found.");
  await writeAudit({ actorUserId, action: "ADMIN_USER_UPDATED", targetType: "User", targetId: targetUserId, metadata: { role: input.role, status: input.status } });
  return user;
}

export async function listAuditLogs(limit = 100) {
  await connectDatabase();
  return AuditLog.find().sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
}
