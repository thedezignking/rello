"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toast";

// Shows a message when the OAuth callback bounces back with ?auth=failed,
// then removes the flag from the URL.
export function AuthNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const failed = params.get("auth") === "failed";

  useEffect(() => {
    if (!failed) return;
    toast.add({
      title: "Sign-in didn't finish",
      description: "Try again, or use your email instead.",
      type: "error",
    });
    const rest = new URLSearchParams(params);
    rest.delete("auth");
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [failed, params, pathname, router]);

  return null;
}
