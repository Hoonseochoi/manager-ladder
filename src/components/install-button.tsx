import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const isKakao = /KAKAOTALK/i.test(ua);
/** 카톡·인스타 등 앱 안 브라우저 — 여기선 홈 화면 추가가 안 된다 */
const isInApp = isKakao || /Instagram|FBAN|FBAV|Line\/|NAVER\(inapp|DaumApps/i.test(ua);
/** iOS 의 Safari 가 아닌 브라우저(크롬 등) */
const isIOSNotSafari = isIOS && /CriOS|FxiOS|EdgiOS|Whale/i.test(ua);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** 크롬·삼성인터넷이 주는 설치 이벤트는 앱이 그려지기 전에 올 수 있어 미리 받아 둔다 */
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

/** 상단 오른쪽 "앱 설치" 버튼 — 이미 앱으로 열었으면 안 보인다 */
export function InstallButton({ fallback }: { fallback?: React.ReactNode }) {
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const [installed, setInstalled] = useState(isStandalone);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const onReady = () => setCanPrompt(!!deferred);
    const onInstalled = () => setInstalled(true);
    listeners.add(onReady);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      listeners.delete(onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // 폰이거나, 데스크톱이라도 브라우저가 설치를 지원할 때만
  const show = !installed && (isIOS || isAndroid || canPrompt);
  if (!show) return <>{fallback}</>;

  const onClick = async () => {
    if (deferred && !isInApp) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      setCanPrompt(false);
      if (outcome === "accepted") setInstalled(true);
      return;
    }
    // 안드로이드 카톡이면 바로 크롬으로 열어준다
    if (isKakao && isAndroid) {
      location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(location.href)}`;
      return;
    }
    setGuide(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="press flex items-center gap-1.5 rounded-full border-[2.5px] border-black bg-amber-300 px-3 py-1.5 text-sm font-extrabold shadow-brutal-sm"
      >
        <Download className="size-4" strokeWidth={2.8} />
        앱 설치
      </button>

      <AnimatePresence>
        {guide && (
          <motion.div
            className="fixed inset-0 z-90 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGuide(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-t-[32px] border-[3px] border-b-0 border-black bg-cream p-6 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] text-left"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-cute text-2xl">홈 화면에 앱 추가</h2>
                <button type="button" aria-label="닫기" onClick={() => setGuide(false)} className="grid size-9 place-items-center rounded-full border-2 border-black bg-white">
                  <X className="size-4" strokeWidth={3} />
                </button>
              </div>
              <ol className="mt-4 flex flex-col gap-3 text-[15px] font-semibold">
                {isInApp ? (
                  <>
                    <Step n={1}>
                      지금은 {isKakao ? "카카오톡" : "앱"} 안의 브라우저라 설치가 안 돼요.
                    </Step>
                    <Step n={2}>
                      오른쪽 아래(또는 위) <b>⋯ 메뉴</b> → <b>{isIOS ? "Safari로 열기" : "다른 브라우저로 열기"}</b>
                    </Step>
                    <Step n={3}>열린 화면에서 다시 <b>앱 설치</b> 버튼을 눌러 주세요.</Step>
                  </>
                ) : isIOS ? (
                  <>
                    {isIOSNotSafari && <Step n={0}>아이폰은 <b>Safari</b> 에서만 설치돼요. 이 주소를 Safari 로 열어 주세요.</Step>}
                    <Step n={1}>
                      화면 아래(또는 주소창 옆) <Share className="inline size-4 align-[-2px]" strokeWidth={2.6} /> <b>공유</b> 버튼
                    </Step>
                    <Step n={2}>
                      목록을 내려서 <SquarePlus className="inline size-4 align-[-2px]" strokeWidth={2.6} /> <b>홈 화면에 추가</b>
                    </Step>
                    <Step n={3}>
                      오른쪽 위 <b>추가</b> → 홈 화면에 <b>설계잇츠me</b> 아이콘이 생겨요
                    </Step>
                  </>
                ) : (
                  <>
                    <Step n={1}>
                      브라우저 오른쪽 위 <b>⋮ 메뉴</b>
                    </Step>
                    <Step n={2}>
                      <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>
                    </Step>
                    <Step n={3}>
                      <b>설치</b> → 홈 화면에 <b>설계잇츠me</b> 아이콘이 생겨요
                    </Step>
                  </>
                )}
              </ol>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      {n > 0 ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-black bg-amber-300 font-mono text-sm font-black">{n}</span>
      ) : (
        <span className="grid size-7 shrink-0 place-items-center text-lg">⚠️</span>
      )}
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
