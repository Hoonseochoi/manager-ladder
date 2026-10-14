/**
 * 매니저 명단 — 바꾸려면 여기를 고치고 main 에 푸시하면 모두에게 똑같이 반영된다.
 */
export const MANAGERS = ["이지호", "이윤채", "정희선", "전은희", "주기쁨", "이채아"];

/**
 * 프로필 사진 — src/assets/managers/ 에 `이름.jpg` (png·webp 도 OK) 로 넣으면 자동으로 붙는다.
 * 없는 사람은 빈 동그라미로 나온다.
 */
const files = import.meta.glob<string>("../assets/managers/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", {
  eager: true,
  query: "?url",
  import: "default",
});
export const AVATARS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop()!.replace(/\.[^.]+$/, "").normalize("NFC"), url]),
);
