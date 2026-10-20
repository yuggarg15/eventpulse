export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-200" />)}</div>
      <div className="h-48 rounded-xl bg-slate-200" />
    </div>
  );
}
