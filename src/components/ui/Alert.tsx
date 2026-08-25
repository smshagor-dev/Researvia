import type { ReactNode } from "react";

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" | "info" }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-blue-200 bg-blue-50 text-blue-800"
  };
  return <div role="status" className={`rounded-lg border px-3 py-2.5 text-sm ${styles[tone]}`}>{children}</div>;
}
