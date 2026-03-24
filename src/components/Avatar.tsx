"use client";

const PALETTE = [
  "#93C5FD", "#86EFAC", "#FDBA74", "#C4B5FD", "#FCA5A5",
  "#67E8F9", "#FDE68A", "#A5B4FC", "#F0ABFC", "#6EE7B7",
];

export default function Avatar({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-20 h-20 text-xl",
  };

  const initials = name.slice(0, 2);
  const colorIndex =
    (name.charCodeAt(0) + (name.length > 1 ? name.charCodeAt(1) : 0)) %
    PALETTE.length;

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: PALETTE[colorIndex] }}
    >
      {initials}
    </div>
  );
}
