export function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center"
      aria-hidden="true"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2F3C96] border-t-transparent" />
    </div>
  );
}
