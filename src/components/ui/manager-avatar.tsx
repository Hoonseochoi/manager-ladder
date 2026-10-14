import { useRef } from "react";
import { Camera, UserRound, X } from "lucide-react";
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
  /** 탭해서 사진 고르기 / 지우기 */
  editable?: boolean;
  onPick?: (file: File) => void;
  onClear?: () => void;
  className?: string;
};

/**
 * 매니저 프로필 사진. 사진이 없으면 점선 테두리의 빈 아바타를 보여준다.
 * editable 이면 탭해서 사진을 넣고, 오른쪽 위 ✕ 로 지울 수 있다.
 */
export function ManagerAvatar({ name, src, size = 48, editable, onPick, onClear, className }: ManagerAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const badge = Math.max(16, Math.round(size * 0.36));

  const face = (
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
  );

  if (!editable) {
    return <span className={cn("relative inline-grid shrink-0", className)}>{face}</span>;
  }

  return (
    <span className={cn("relative inline-grid shrink-0", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-full transition-transform duration-300 ease-spring active:scale-90"
        aria-label={src ? `${name} 사진 바꾸기` : `${name} 사진 넣기`}
      >
        {face}
      </button>

      {src ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`${name} 사진 지우기`}
          className="absolute -right-1 -top-1 grid place-items-center rounded-full border-2 border-black bg-white shadow-brutal-sm"
          style={{ width: badge, height: badge }}
        >
          <X strokeWidth={3} style={{ width: badge * 0.55, height: badge * 0.55 }} />
        </button>
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full border-2 border-black bg-amber-300 shadow-brutal-sm"
          style={{ width: badge, height: badge }}
        >
          <Camera strokeWidth={2.6} style={{ width: badge * 0.55, height: badge * 0.55 }} />
        </span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick?.(f);
          e.target.value = "";
        }}
      />
    </span>
  );
}

export default ManagerAvatar;
