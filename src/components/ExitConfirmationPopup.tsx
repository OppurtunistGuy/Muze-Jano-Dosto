import * as React from "react";
import { useState, useEffect } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { LogOut, Save, Trash2 } from "lucide-react";
import { clearPlay } from "@/lib/playSession";
import { updateSessionLevelAndMeta } from "@/lib/session";

interface ExitConfirmationPopupProps {
  isRemote: boolean;
  dbSessionId?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  shouldBlock?: boolean;
}

export function ExitConfirmationPopup({
  isRemote,
  dbSessionId,
  isOpen,
  setIsOpen,
  shouldBlock = true,
}: ExitConfirmationPopupProps) {
  const navigate = useNavigate();
  const [localShouldBlock, setLocalShouldBlock] = useState(true);
  const activeShouldBlock = shouldBlock && localShouldBlock;

  // 1. Hook beforeunload (browser back, reload, tab close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeShouldBlock) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit? Your progress may be lost.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeShouldBlock]);

  // 2. Hook router navigation transitions using useBlocker
  useBlocker({
    blockerFn: () => {
      setIsOpen(true);
      return true; // block transition
    },
    condition: activeShouldBlock,
  });

  function handleSaveAndExit() {
    setLocalShouldBlock(false);
    setIsOpen(false);
    // Keep local session / dbSession intact. Just navigate home.
    setTimeout(() => {
      navigate({ to: "/" });
    }, 50);
  }

  async function handleExitWithoutSaving() {
    setLocalShouldBlock(false);
    setIsOpen(false);

    // Discard session
    clearPlay();

    if (isRemote && dbSessionId) {
      try {
        // Update session in DB to abandoned so partner is notified
        await updateSessionLevelAndMeta(dbSessionId, 1, {
          abandoned: true,
          status: "abandoned",
        });
      } catch (e) {
        console.error("Failed to mark remote session abandoned:", e);
      }
    }

    setTimeout(() => {
      navigate({ to: "/" });
    }, 50);
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-charcoal/70 backdrop-blur-md p-5 animate-fade-in"
    >
      <div className="w-full max-w-sm animate-rise" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-3xl glass-strong p-6 shadow-card text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
            <LogOut className="h-6 w-6" />
          </div>

          <h2 className="font-display text-xl font-bold text-charcoal">Exit Game?</h2>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            Would you like to save your current deck position and scores, or discard this session?
          </p>

          <div className="mt-6 w-full flex flex-col gap-2">
            <button
              onClick={handleSaveAndExit}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-gradient px-4 py-3 text-xs font-semibold text-white shadow-soft hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
            >
              <Save className="h-4 w-4" /> Save & Exit
            </button>

            <button
              onClick={handleExitWithoutSaving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50/50 hover:bg-red-50 px-4 py-3 text-xs font-semibold text-red-600 transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" /> Exit Without Saving
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-2 text-xs font-medium text-charcoal/50 hover:text-charcoal transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
