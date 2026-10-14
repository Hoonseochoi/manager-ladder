import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { ManagerPicker } from "@/components/manager-picker";
import type { Entry } from "@/lib/ladder";

type Props = {
  /** 고치는 중인 매물 (없으면 닫힘) */
  entry: Entry | null;
  managers: string[];
  avatars: Record<string, string>;
  onSave: (next: Entry) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** 설계매물 한 건 고치기 — 아래에서 올라오는 시트 */
export function EntryEditor({ entry, managers, avatars, onSave, onDelete, onClose }: Props) {
  const [designer, setDesigner] = useState("");
  const [manager, setManager] = useState("");

  useEffect(() => {
    if (entry) {
      setDesigner(entry.designer);
      setManager(entry.manager);
    }
  }, [entry]);

  // 명단에 없는 매니저가 걸려 있으면 그 이름도 보여준다
  const options = manager && !managers.includes(manager) ? [...managers, manager] : managers;

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            className="fixed inset-0 z-60 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.form
            role="dialog"
            aria-label="설계매물 고치기"
            className="fixed inset-x-0 bottom-0 z-70 mx-auto max-w-xl rounded-t-[34px] border-[3px] border-b-0 border-black bg-cream px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!designer.trim()) return;
              onSave({ designer: designer.trim(), manager });
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-black/25" />
            <div className="flex items-center justify-between">
              <h2 className="font-cute text-[26px] leading-none">매물 고치기 ✏️</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="press grid size-9 place-items-center rounded-full border-[2.5px] border-black bg-white shadow-brutal-sm"
              >
                <X className="size-4" strokeWidth={3} />
              </button>
            </div>

            <label className="mt-5 block px-1 text-sm font-extrabold">설계사 이름</label>
            <input
              value={designer}
              onChange={(e) => setDesigner(e.target.value)}
              enterKeyHint="done"
              autoComplete="off"
              className="mt-2 w-full rounded-full border-[2.5px] border-black bg-white px-5 py-2.5 text-[17px] font-semibold shadow-brutal-sm outline-none focus:shadow-brutal"
            />

            <label className="mt-5 block px-1 text-sm font-extrabold">매니저</label>
            <ManagerPicker className="mt-2.5" managers={options} avatars={avatars} value={manager} onChange={setManager} />

            <div className="mt-7 flex gap-2.5">
              <button
                type="button"
                onClick={onDelete}
                className="press flex h-13 items-center gap-1.5 rounded-full border-[2.5px] border-black bg-rose-300 px-5 font-extrabold shadow-brutal-sm"
              >
                <Trash2 className="size-4" strokeWidth={2.6} /> 삭제
              </button>
              <button
                type="submit"
                disabled={!designer.trim()}
                className="press h-13 flex-1 rounded-full border-[2.5px] border-black bg-amber-300 text-[17px] font-extrabold shadow-brutal disabled:opacity-40"
              >
                저장
              </button>
            </div>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
