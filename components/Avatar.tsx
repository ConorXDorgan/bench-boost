/**
 * Initials avatar with the Accenture purple gradient.
 * Used in the bench table rows, the resource detail dialog, and the AI
 * candidate cards.
 */
export default function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClasses =
    size === "md" ? "h-10 w-10 text-xs" : "h-8 w-8 text-[11px]";

  return (
    <span
      aria-hidden="true"
      className={`acn-gradient-purple inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-sm ${sizeClasses}`}
    >
      {initials || "·"}
    </span>
  );
}
