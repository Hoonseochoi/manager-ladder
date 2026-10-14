import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { cn } from "@/lib/utils";

type Props = {
  managers: string[];
  avatars: Record<string, string>;
  value: string;
  onChange: (name: string) => void;
  className?: string;
};

/** 매니저 명단에서 한 명 고르는 알약 버튼 줄 */
export function ManagerPicker({ managers, avatars, value, onChange, className }: Props) {
  if (!managers.length) {
    return <p className={cn("text-[13px] text-black/45", className)}>매니저 명단이 비어 있어요. 아래에서 추가해 주세요.</p>;
  }
  return (
    <div role="radiogroup" aria-label="매니저 선택" className={cn("flex flex-wrap gap-2", className)}>
      {managers.map((m) => {
        const on = m === value;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? "" : m)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border-[2.5px] border-black py-1 pl-1 pr-3 text-sm font-extrabold transition-[transform,background-color,box-shadow] duration-300 ease-spring active:scale-90",
              on ? "-translate-y-0.5 bg-amber-300 shadow-brutal" : "bg-white shadow-brutal-sm",
            )}
          >
            <ManagerAvatar name={m} src={avatars[m]} size={24} />
            {m}
          </button>
        );
      })}
    </div>
  );
}
