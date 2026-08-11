function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = 40,
  rounded = "rounded-full",
}: {
  name: string;
  src?: string | null;
  size?: number;
  rounded?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`${rounded} object-cover border border-white/10 flex-shrink-0`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`${rounded} border border-white/10 bg-white/5 flex items-center justify-center text-white/40 font-display flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
