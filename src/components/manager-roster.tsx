import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus } from "lucide-react";
import { ManagerAvatar } from "@/components/ui/manager-avatar";
import { cn } from "@/lib/utils";

type Props = {
  managers: string[];
  avatars: Record<string, string>;
  onAdd: (name: string) => boolean;
  onRename: (from: string, to: string) => boolean;
  onRemove: (name: string) => void;
  onPickPhoto: (name: string, file: File) => void;
  onClearPhoto: (name: string) => void;
};

/** 매니저 명단: 사진 넣기 + 편집 모드에서 이름 바꾸기·추가·삭제 */
export function ManagerRoster({ managers, avatars, onAdd, onRename, onRemove, onPickPhoto, onClearPhoto }: Props) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");

  const submitAdd = () => {
    if (onAdd(adding)) setAdding("");
  };

  return (
    <section className="brutal-card mb-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-cute text-2xl">매니저 명단</h2>
        <div className="flex items-center gap-2">
          <span className="rounded-full border-2 border-black bg-violet-300 px-2.5 py-0.5 font-mono text-xs font-black">
            {managers.length}명
          </span>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={cn(
              "press flex items-center gap-1 rounded-full border-[2.5px] border-black px-3 py-1 text-sm font-extrabold shadow-brutal-sm",
              editing ? "bg-emerald-300" : "bg-white",
            )}
          >
            {editing ? (
              <>
                <Check className="size-4" strokeWidth={3} /> 완료
              </>
            ) : (
              "편집"
            )}
          </button>
        </div>
      </div>
      <p className="mt-1.5 px-0.5 text-[13px] text-black/50">
        {editing ? "이름을 눌러 고치고, − 로 빼고, 아래에서 추가해요 ✏️" : "빈 동그라미를 탭해서 프로필 사진을 넣어요 📸"}
      </p>

      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-2 gap-y-4 pt-2">
        <AnimatePresence initial={false}>
          {managers.map((m) => (
            <motion.li
              key={m}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="relative flex flex-col items-center gap-1.5"
            >
              <motion.span
                animate={editing ? { rotate: [-2, 2, -2] } : { rotate: 0 }}
                transition={editing ? { repeat: Infinity, duration: 0.35 } : { duration: 0.2 }}
                className="relative"
              >
                <ManagerAvatar
                  name={m}
                  src={avatars[m]}
                  size={60}
                  editable={!editing}
                  onPick={(f) => onPickPhoto(m, f)}
                  onClear={() => onClearPhoto(m)}
                />
                {editing && (
                  <button
                    type="button"
                    aria-label={`${m} 빼기`}
                    onClick={() => onRemove(m)}
                    className="absolute -left-1 -top-1 grid size-6 place-items-center rounded-full border-2 border-black bg-rose-400 text-white shadow-brutal-sm active:scale-90"
                  >
                    <Minus className="size-3.5" strokeWidth={4} />
                  </button>
                )}
              </motion.span>
              {editing ? <NameField name={m} onRename={onRename} /> : <span className="w-full truncate text-center text-[13px] font-bold">{m}</span>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <form
        className="mt-5 flex items-center gap-2 rounded-full border-[2.5px] border-black bg-cream py-1 pl-4 pr-1 shadow-brutal-sm"
        onSubmit={(e) => {
          e.preventDefault();
          submitAdd();
        }}
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="새 매니저 이름"
          aria-label="새 매니저 이름"
          enterKeyHint="done"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] font-semibold outline-none placeholder:text-black/30"
        />
        <button
          type="submit"
          aria-label="매니저 추가"
          className="press grid size-9 shrink-0 place-items-center rounded-full border-[2.5px] border-black bg-violet-300 shadow-brutal-sm"
        >
          <Plus className="size-4" strokeWidth={3} />
        </button>
      </form>
    </section>
  );
}

function NameField({ name, onRename }: { name: string; onRename: (from: string, to: string) => boolean }) {
  const [v, setV] = useState(name);
  const commit = () => {
    if (v.trim() === name) return;
    if (!onRename(name, v)) setV(name);
  };
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      aria-label={`${name} 이름 고치기`}
      enterKeyHint="done"
      className="w-full rounded-full border-2 border-dashed border-black bg-amber-100 px-1 py-0.5 text-center text-[13px] font-bold outline-none focus:border-solid focus:bg-amber-200"
    />
  );
}
