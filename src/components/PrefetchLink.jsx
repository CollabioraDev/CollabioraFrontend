import { Link } from "react-router-dom";
import { preloadRoute } from "../utils/routePreload.js";

/**
 * Link that prefetches the route chunk on hover/focus so navigation feels instant.
 * Use for internal app links (same props as react-router-dom Link).
 */
export default function PrefetchLink({ to, onMouseEnter, onFocus, ...props }) {
  const pathname = typeof to === "string" ? to : to?.pathname ?? "";
  const prefetch = () => pathname && preloadRoute(pathname);

  return (
    <Link
      to={to}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
      {...props}
    />
  );
}
