"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAnonUserId } from "@/lib/client/anon-user";

export function BelajarUserSync({ serverHasUserKey }: { serverHasUserKey: boolean }) {
  const router = useRouter();
  const userId = useAnonUserId();
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (!serverHasUserKey && userId && !refreshedRef.current) {
      refreshedRef.current = true;
      router.refresh();
    }
  }, [router, serverHasUserKey, userId]);

  return null;
}
