export function Section({ icon: Icon, title, children, gradient, actions }) {
  return (
    <div
      className="rounded-xl p-5 border shadow-sm"
      style={
        gradient
          ? { background: gradient.bg, borderColor: gradient.border }
          : { background: "#F5F5F5", borderColor: "rgba(232,232,232,1)" }
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4
          className="font-bold flex items-center gap-2 text-base"
          style={{ color: "#2F3C96" }}
        >
          <Icon className="w-5 h-5 shrink-0" style={{ color: "#2F3C96" }} />
          {title}
        </h4>
        {actions}
      </div>
      {children}
    </div>
  );
}
