import { useState } from "react";
import { motion } from "framer-motion";

/** 처음 들어왔을 때 "누가 돌렸는지" 남기려고 이름을 받는다 */
export function NamePrompt({ initial = "", onSave, onCancel }: { initial?: string; onSave: (name: string) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial);
  const value = name.trim();

  return (
    <motion.div
      className="fixed inset-0 z-90 grid place-items-center bg-black/40 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.form
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (value) onSave(value);
        }}
        className="brutal-card w-full max-w-sm p-6"
      >
        <p className="text-3xl">👋</p>
        <h2 className="mt-2 font-cute text-2xl">이름이 뭐예요?</h2>
        <p className="mt-1 text-[13px] text-black/50">사다리를 누가 돌렸는지 기록에 같이 남겨요.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 최훈서"
          maxLength={20}
          enterKeyHint="done"
          autoComplete="name"
          className="mt-4 w-full rounded-full border-[2.5px] border-black bg-cream px-5 py-2.5 text-[16px] font-semibold shadow-brutal-sm outline-none placeholder:text-black/30 focus:shadow-brutal"
        />
        <div className="mt-4 flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="flex-1 rounded-full py-2.5 text-sm font-extrabold text-black/50 active:bg-black/5">
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={!value}
            className="press flex-1 rounded-full border-[2.5px] border-black bg-amber-300 py-2.5 text-[15px] font-extrabold shadow-brutal-sm disabled:opacity-40"
          >
            시작하기
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
