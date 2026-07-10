"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/app/follow-actions";

export function FollowButton({
  criticId,
  following,
  size = "md",
}: {
  criticId: string;
  following: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(following);
  const [pending, start] = useTransition();

  function onClick() {
    if (pending) return;
    start(async () => {
      const res = await toggleFollowAction(criticId);
      if (res.ok) {
        setIsFollowing(res.following);
        router.refresh();
      } else if (res.reason === "auth") {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      }
    });
  }

  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5";

  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-pressed={isFollowing}
      className={`rounded-full font-semibold transition disabled:opacity-60 ${pad} ${
        isFollowing
          ? "border border-line bg-paper text-ink hover:border-ink/30"
          : "bg-ink text-cream hover:bg-ink/90"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
