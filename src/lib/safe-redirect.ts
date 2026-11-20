const BASE = "https://same-site.invalid";

export function safeNext(value: string | null) {
  if (!value?.startsWith("/") || /[\\\u0000-\u0020]/.test(value)) return "/resumes";
  try {
    const url = new URL(value, BASE);
    return url.origin === BASE ? `${url.pathname}${url.search}${url.hash}` : "/resumes";
  } catch {
    return "/resumes";
  }
}
