# KnowEm — changes.md
**Tracking Document: Roadmap Phase Status + Change Requirements**
**Last Updated:** 4 July 2026

---

## How to use this file

Each phase from the KnowEm vNext Roadmap is tracked here with a live status. Update the status column as work completes — don't mark a phase ✅ Done until its acceptance criteria are verified, not just implemented.

**Status legend:**
⬜ Not Started · 🔵 In Progress · 🟡 Needs Verification · ✅ Done · 🔴 Blocked

---

## ⚠️ Build Health Requirement (Standing Rule)

**Applies to every phase below, permanently.**

`bun run build` must complete cleanly with **no runtime/build errors** after any change is made. A change is not considered complete if it introduces or leaves behind a build failure — even if the feature itself works in dev mode.

### Current Known Build Issue (Resolved)

All build issues are resolved. The TanStack Start plugin `TypeError` on `serverBuild.fetch` is successfully mitigated.

- **Status:** ✅ Done (Resolved & Verified)
- **Mitigation:** Configured the postbuild script to export a default proxy mapping to `globalThis.__nitro__.default.fetch(req)`, which successfully satisfies the plugin's runtime fetch handler check.

---

## Phase Status

| Phase | Focus | Status | Notes |
|---|---|---|---|
| Phase 1 | Critical Gameplay Fixes (Upload Pipeline, Deck Builder, Wild Cards, Duplicate Card Fix, Exit Confirmation) | ✅ Done | Includes CR-002 item 1.7 |
| Phase 2 | UX & Visual Polish (Question Source Screen, Level 2 Refresh, Design System, Wheel Spotlight) | ✅ Done | Includes CR-002 item 2.4 and CR-003 |
| Phase 3 | Gameplay Validation (Save & Resume, Browser Nav, Session Recovery, Deck Integrity) | ✅ Done | Must also cover exit-triggered saves from 1.7 |
| Phase 4 | Performance (mid-range Android profiling) | ✅ Done | |
| Phase 5 | Accessibility | ✅ Done | |
| Phase 6 | Configuration Cleanup | ✅ Done | |
| Phase 7 | Automated Regression Suite | ⬜ Not Started | |
| Phase 8 | Production Validation | ⬜ Not Started | Must include clean build verification + exit/resume cycle test |
| Phase 9 | Definition of Done (v1.0) | ⬜ Not Started | Ready for phase progression |

---

## Change Log

| Date | Item | Type | Status |
|---|---|---|---|
| 4 Jul 2026 | CR-002.1 — Exit Confirmation Popup (Save/Exit without saving) | Mandatory Addition | ✅ Done |
| 4 Jul 2026 | CR-002.2 — Conversation Wheel Spotlight Brightness Fix | Mandatory Addition | ✅ Done |
| 4 Jul 2026 | Build error — TanStack Start plugin `fetch` TypeError on `bun run build` | Blocker | ✅ Done |

---

## Next Action

Resolve the next set of phase requirements as prompted.
