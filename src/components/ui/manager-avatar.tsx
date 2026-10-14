import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_TINTS = ["bg-amber-100", "bg-cyan-100", "bg-rose-100", "bg-emerald-100", "bg-violet-100", "bg-lime-100"];

/** 이름마다 고정된 파스텔 배경 (빈 아바타용) */
function tintFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EMPTY_TINTS[h % EMPTY_TINTS.length];
}

export type ManagerAvatarProps = {
  name: string;
  src?: string;
  /** px */
  size?: number;
  className?: string;
};

/** 매니저 프로필 사진. 사진이 없으면 점선 테두리의 빈 아바타를 보여준다. */
export function ManagerAvatar({ name, src, size = 48, className }: ManagerAvatarProps) {
  return (
    <span className={cn("relative inline-grid shrink-0", className)}>
      <span
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-full border-black",
          size >= 40 ? "border-[2.5px]" : "border-2",
          src ? "bg-white" : cn(tintFor(name), "border-dashed"),
        )}
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt={`${name} 프로필`} className="size-full object-cover" draggable={false} />
        ) : (
          <UserRound className="text-black/45" strokeWidth={2.2} style={{ width: size * 0.56, height: size * 0.56 }} />
        )}
      </span>
    </span>
  );
}

export default ManagerAvatar;
