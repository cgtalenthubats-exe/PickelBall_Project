"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Volume2, VolumeX } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

const POLL_MS = 20000;

export function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  // Lazy init from localStorage (client-only component, so window exists).
  const [muted, setMuted] = useState(
    () =>
      typeof window === "undefined" ||
      localStorage.getItem("notif-sound") !== "on",
  );
  const prevCount = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const beep = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      audioCtx.current ??= new Ctx();
      const ctx = audioCtx.current;
      // two short rising tones — clearly "ping!" without an audio asset
      [880, 1320].forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = "sine";
        o.frequency.value = freq;
        const t = ctx.currentTime + idx * 0.16;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        o.start(t);
        o.stop(t + 0.16);
      });
    } catch {
      /* audio blocked — ignore */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const json = (await res.json()) as { items: Notif[]; count: number };
        if (!alive) return;
        // Beep only on a genuine increase after the first successful poll.
        if (
          prevCount.current !== null &&
          json.count > prevCount.current &&
          !muted
        ) {
          beep();
        }
        prevCount.current = json.count;
        setItems(json.items);
      } catch {
        /* offline / transient — keep last state */
      }
    };
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [muted, beep]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("notif-sound", next ? "off" : "on");
    if (!next) {
      // Unmuting is a user gesture — unlock/prime the audio context now.
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) {
          audioCtx.current ??= new Ctx();
          audioCtx.current.resume?.();
          beep();
        }
      } catch {
        /* ignore */
      }
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "POST" });
    prevCount.current = 0;
    setItems([]);
  };

  const count = items.length;

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="การแจ้งเตือน"
          className="relative p-2 rounded-lg hover:bg-bone transition-colors cursor-pointer"
        >
          <Bell className="w-5 h-5 text-ink" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-clay text-white text-[10px] font-medium flex items-center justify-center tnum">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
        <button
          onClick={toggleMute}
          aria-label={muted ? "เปิดเสียงเตือน" : "ปิดเสียงเตือน"}
          title={muted ? "เปิดเสียงเตือน" : "ปิดเสียงเตือน"}
          className="p-2 rounded-lg hover:bg-bone transition-colors cursor-pointer text-taupe"
        >
          {muted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4 text-pine" />
          )}
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-80 max-w-[90vw] z-50 rounded-2xl border border-line bg-surface shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
              <span className="text-sm font-medium text-ink">การแจ้งเตือน</span>
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-taupe hover:text-ink cursor-pointer"
                >
                  อ่านแล้วทั้งหมด
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {count === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-taupe">
                  ไม่มีการแจ้งเตือนใหม่
                </p>
              ) : (
                items.map((n) => {
                  const inner = (
                    <>
                      <div className="text-sm text-ink font-medium">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-taupe mt-0.5">{n.body}</div>
                      )}
                    </>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 border-b border-line last:border-0 hover:bg-bone/60"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div
                      key={n.id}
                      className="px-4 py-3 border-b border-line last:border-0"
                    >
                      {inner}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
