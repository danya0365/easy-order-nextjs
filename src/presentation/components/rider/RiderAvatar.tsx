import { UserRound } from "lucide-react";

import { riderAvatarSrc } from "@/src/domain/services/rider-contact";

/** Round rider photo with an icon fallback. Usable from server or client. */
export function RiderAvatar({
  rider,
  size = 40,
}: {
  rider: { id: string; name: string; avatarUrl?: string | null };
  size?: number;
}) {
  const src = riderAvatarSrc(rider);
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={rider.name}
        width={size}
        height={size}
        style={style}
        className="shrink-0 rounded-full object-cover ring-1 ring-border"
        data-testid="rider-avatar"
      />
    );
  }
  return (
    <span
      style={style}
      className="grid shrink-0 place-items-center rounded-full bg-muted-surface text-muted ring-1 ring-border"
      aria-hidden
    >
      <UserRound style={{ width: size * 0.55, height: size * 0.55 }} />
    </span>
  );
}
