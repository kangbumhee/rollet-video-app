// ============================================
// 파일: src/lib/utils/masking.ts
// 설명: [보강⑧] 개인정보 마스킹
//       알림·로그에서 PII 노출 방지
// ============================================

/**
 * 이름 마스킹: "홍길동" → "홍*동", "김수" → "김*"
 */
export function maskName(name: string): string {
  if (!name) return "***";
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

/**
 * 전화번호 마스킹: "010-1234-5678" → "010-****-5678"
 */
export function maskPhone(phone: string): string {
  if (!phone) return "***-****-****";
  const clean = phone.replace(/-/g, "");
  if (clean.length < 10) return "***-****-****";
  return `${clean.slice(0, 3)}-****-${clean.slice(-4)}`;
}

/**
 * 주소 마스킹: "서울시 강남구 삼성로 123 아파트 101호"
 *            → "서울시 강남구 ***"
 */
export function maskAddress(address: string): string {
  if (!address) return "***";
  const parts = address.split(" ");
  if (parts.length <= 2) return parts[0] + " ***";
  return parts.slice(0, 2).join(" ") + " ***";
}

/**
 * 이메일 마스킹: "test@example.com" → "te**@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return local[0] + "*@" + domain;
  return local.slice(0, 2) + "*".repeat(local.length - 2) + "@" + domain;
}
