import Link from "next/link";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="ResearVia home">
      <span className={`grid size-9 place-items-center rounded-xl text-sm font-bold ${inverse ? "bg-white text-slate-950" : "bg-slate-950 text-white"}`}>
        R
      </span>
      <span className={`text-base font-semibold tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}>ResearVia</span>
    </Link>
  );
}
