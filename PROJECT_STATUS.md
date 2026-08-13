# TableLint — project status

## Current stage

**Stage 11 — release and case study: IN PROGRESS**

Текущее разрешённое действие: завершить только Stage 11 из `DEVELOPMENT_PLAN.md`. Локальная release-кандидат сборка готова; production deploy ожидает настройку удалённого репозитория и доступа к хостингу.

## Stage checklist

| Stage | Name | Status | Evidence |
|---:|---|---|---|
| 0 | Repository foundation | Complete | Vite shell; guarded `#/`, `#/setup`, `#/workspace`, `#/report`; `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; production preview at 1440/768/390 |
| 1 | Visual system and shell | Complete | Warm editorial shell; Button/Input/Dialog/Progress smoke tests; Playwright keyboard/dialog smoke; manual 1440×900, 768×1024, 390×844 and reduced-motion verification |
| 2 | Upload onboarding | Complete | Picker/drop/sample; extension and 50 MB guards; local File API read with progress/cancel/error/retry; setup transition; Vitest integration and Playwright no-external-request smoke; manual 1440×900, 768×1024, 390×844 |
| 3 | Worker parsing and inference | Complete | Versioned Zod Worker contract; Papa Parse fixtures for `,`, `;`, Tab and `|`; UTF-8/header/delimiter guards; deterministic schema inference; progress/cancel/stale/crash recovery; Vitest and Playwright coverage; manual 1440×900, 768×1024, 390×844 |
| 4 | Rule setup | Complete | Preview table; inferred types/confidence; editable required, unique, email, number, date, allowed values, min/max length; Zod-backed config validation; Redux draft persistence; responsive 1440×900, 768×1024 and 390×844; Vitest and Playwright coverage |
| 5 | Validation engine | Complete | Pure validators for all v1 rules; unique indexes; versioned Worker validation with progress/cancel/stale/retry; normalized Redux issues; deterministic score/selectors; sample summary 2 errors and score 87; responsive summary UI |
| 6 | Virtualized grid | Complete | `@tanstack/react-virtual` row window; sticky header and row numbers; deterministic column widths; local selected cell with arrow-key roving focus; error/warning cell styling; loading, empty, error and clean states; bounded large-fixture DOM and correct end-row identity; vertical wheel chains to the page when the grid has no remaining vertical scroll |
| 7 | Issue navigation | Complete | Left issue groups and counts; All/issues/clean plus rule/column filters; URL-safe selection; previous/next inspector; virtualizer scroll and cell focus; responsive drawer baseline; zero-results and clean states |
| 8 | Editing and fixes | Complete | Typed cell/row patch overlay; keyboard/double-click manual edit; selective safe-fix preview; trim/allowed-value/date/empty-row/duplicate-row planners; bounded undo/redo; localized revalidation; score and issue restoration |
| 9 | Persistence and export | Complete | Versioned Zod-validated IndexedDB session with recovery/clear UI; stale payload reset; Worker CSV export preserving delimiter and quoting policy; optional formula protection; Zod JSON report and responsive report screen; round-trip/reload E2E coverage |
| 10 | Accessibility and resilience | Complete | Responsive modal drawers with focus containment/restoration; extended grid keyboard navigation and live announcements; app and Worker recovery states; axe workflow audit; 100k-row benchmark; 1440×900, 768×1024 and 390×844 verification |
| 11 | Release and case study | In progress | TableLint 1.0.0 release candidate: product data-workbench redesign with graphite/violet identity, persistent system-aware light/dark themes, persistent RU/EN interface, compact shell and score strip, keyboard-accessible Data/Issues/History tabs, synchronized `fx` editor plus inline cell editing, adjacent undo/redo/fix controls, responsive grid, English README case study and GitHub Pages workflow; Vitest 105/105 and Playwright 20/20; local `v1.0.0` tag. Production URL remains pending. |
| 12 | Power-user data workbench | Blocked by Stage 11 | Command palette and spreadsheet shortcuts; search/replace and column filters; row selection and batch edit; column profiles and original/cleaned comparison; local rule presets; export settings and readiness review. |

Allowed statuses: `Not started`, `In progress`, `Complete`, `Blocked by Stage N`.

## Completion protocol

Stage можно отметить как `Complete` только когда:

1. Выполнены все exit criteria соответствующего stage.
2. Запущены и перечислены обязательные checks.
3. Затронутый интерфейс проверен на предусмотренных размерах.
4. В таблицу добавлено краткое evidence: команды, страницы или сценарии.
5. Следующий stage разблокирован, но **не начат в этом же чате**.

При завершении stage обновить:

- статус текущего stage на `Complete`;
- статус следующего с `Blocked` на `Not started`;
- секцию `Current stage` на следующий stage;
- журнал ниже.

## Work log

| Date | Stage | Summary | Checks |
|---|---:|---|---|
| 2026-08-13 | 0 | React 19/Vite foundation, strict TypeScript, Redux workflow guards, HashRouter states, tokens, Vitest/Testing Library, Playwright skeleton and CI | `typecheck`; `lint`; Vitest 5/5; production build; preview routes and 1440×900, 768×1024, 390×844 |
| 2026-08-13 | 1 | Warm editorial tokens and typography, responsive header/stepper/shell, accessible Button/Input/Dialog/Progress primitives and demo states | `format:check`; `typecheck`; `lint`; Vitest 9/9; Playwright 1/1; production build; manual 1440×900, 768×1024, 390×844, focus and reduced motion |
| 2026-08-13 | 2 | Real CSV picker/drop onboarding, versioned sample, size/extension/UTF-8/basic structure guards, local read progress/cancel/retry and validated setup handoff | `format:check`; `typecheck`; `lint`; Vitest 21/21; Playwright 2/2 including no external requests; production build; manual 1440×900, 768×1024, 390×844 |
| 2026-08-13 | 3 | Moved byte reading, fatal UTF-8 decoding and CSV parsing into a Dedicated Worker; added versioned Zod boundaries, delimiter/header detection, typed dataset results, deterministic schema inference and recoverable setup states | `format:check`; `typecheck`; `lint`; Vitest 34/34; Playwright 3/3 including no external requests and Worker failure recovery; production build with separate Worker chunk; manual 1440×900, 768×1024, 390×844, focus and console checks |
| 2026-08-13 | 4 | Completed rule setup with responsive preview, column navigation, editable inferred types, every v1 rule, typed/Zod-validated configuration and Redux workflow persistence; invalid drafts block scan with an explanation and new uploads reset stale configuration | `format:check`; `typecheck`; `lint`; Vitest 42/42; Playwright 5/5 including invalid config, route persistence, reload guard and no external requests; production build; manual 1440×900, 768×1024, 390×844, internal overflow, keyboard controls and console checks |
| 2026-08-13 | 5 | Added deterministic validation for every v1 rule, non-empty unique indexes, severity and safe-fix metadata, versioned Worker scan with progress/cancel/stale/retry, normalized issues and score/group selectors, plus a real responsive quality summary | `format:check`; `typecheck`; `lint`; Vitest 63/63; Playwright 6/6 including sample score and no external requests; production build with Worker chunk; manual sample at 1440×900, 768×1024 and 390×844 with no horizontal overflow or console errors |
| 2026-08-13 | 6 | Added the real virtualized CSV grid with sticky headers and row numbers, bounded deterministic column widths, selected-cell roving focus, issue severity markers, and explicit loading/empty/error/clean views without beginning Stage 7 navigation or filters | `format:check`; `typecheck`; `lint`; Vitest 69/69 including 10k-row bounded DOM fixture; Playwright 7/7 including 2k-row end-scroll identity and DOM limit; production build; manual sample at 1440×900, 768×1024 and 390×844 with internal horizontal scroll, sticky header, ArrowRight focus and no console errors |
| 2026-08-13 | 7 | Added an issue workbench with rule/column groups, consistent All/issues/clean row filters, URL-safe issue state, inspector navigation, virtualized scroll/focus to source coordinates, and responsive side-panel drawers without beginning editing or fixes | `format:check`; `typecheck`; `lint`; Vitest 75/75 including filter/query/source-coordinate tests; Playwright 8/8 including issue selection, focus, row counts and 2k-row virtualization; production build; manual 1440×900, 768×1024 and 390×844 drawer/overflow/console verification |
| 2026-08-13 | 8 | Added immutable base-row patch overlays, manual cell editing, selective safe-fix previews, reversible trim/allowed-value/date/empty-row/duplicate-row planners, bounded undo/redo and localized issue/score revalidation without beginning persistence or export | `format:check`; `typecheck`; `lint`; Vitest 87/87 including base immutability and per-fix reversibility; Playwright 10/10 including manual edit/undo/redo and preview cancel/selective apply; production build; manual 1440×900, 768×1024 and 390×844 dialog/action-bar/overflow/console verification |
| 2026-08-13 | 9 | Added a versioned local session in IndexedDB with explicit recovery/clear UI and safe stale-schema reset; completed the Worker export contract with original delimiter, selectable quoting, optional CSV-injection protection, Blob downloads, a Zod-validated JSON report and the real report screen | `format:check`; `typecheck`; `lint`; Vitest 92/92 including CSV round-trip and report/session schemas; Playwright 13/13 including reload recovery, stale reset and downloaded CSV/JSON verification; production build; manual report/recovery verification at 1440×900, 768×1024 and 390×844 with no horizontal overflow or console errors |
| 2026-08-13 | 10 | Completed responsive mobile drawers, focus containment/restoration, grid Page/Home/End shortcuts and live announcements, global error recovery, Worker memory-limit guidance, serious-level axe audit and an explicit 100k-row performance fixture with documented limits | `format:check`; `typecheck`; `lint`; Vitest 97/97; Playwright 17/17 including keyboard-only export, mobile drawer focus, axe on upload/setup/workspace/report and 100k rows in ~6 s; production build; manual 1440×900, 768×1024 and 390×844 verification with no horizontal overflow or console errors |
| 2026-08-13 | 11 | Began release polish with an approved compact workspace direction: true inline cell editor, Data/Issues/History tabs, local edit toolbar with undo/redo/fix preview, bottom export action and a softer accessible sage/ivory/clay visual system | `format:check`; `typecheck`; `lint`; Vitest 98/98; Playwright 17/17 including inline edit and axe; production build; manual 1440×900, 768×1024 and 390×844 with row-sized grid, no horizontal overflow or console errors |
| 2026-08-13 | 11 | Prepared TableLint 1.0.0 release candidate: completed product rebrand, added original table/check identity, favicon and social preview, metadata, keyboard tab traversal, repository-base builds, GitHub Pages workflow, portfolio README with architecture/trade-offs and local `v1.0.0` tag | `format:check`; `typecheck`; `lint`; Vitest 99/99; Playwright 18/18 including roving tabs, inline editing, axe and 100k rows; root and repository-base production builds; production deploy pending remote/host access |
| 2026-08-13 | 11 | Reworked the approved UI into a denser product data-workbench: graphite/violet visual system, compact app chrome and workflow navigation, unified score strip, embedded tabs, modernized virtual grid and issue surfaces, and a synchronized Excel-style `fx` editor | `format:check`; `typecheck`; `lint`; Vitest 100/100; Playwright 19/19 including formula-bar editing, inline editing, tab keyboard navigation, axe and 100k rows; production build |
| 2026-08-13 | 11 | Added a system-aware light/dark theme with an accessible header switch, local preference persistence, safe embedded-browser fallback and dedicated dark-state surface/error/table tokens | `format:check`; `typecheck`; `lint`; Vitest 104/104; Playwright 20/20 including persisted dark theme and dark-workspace axe audit; production build |
| 2026-08-14 | 11 | Added a persistent RU/EN language switch, localized the complete upload/setup/workspace/export workflow without altering CSV values, translated metadata and rewrote the portfolio README in English | `format:check`; `typecheck`; `lint`; Vitest 105/105; Playwright 20/20; production build; browser verification of reload persistence, English sample workflow and 390px overflow |

## Known risks / blockers

- 50 MB остаётся продуктовой границей; широкие наборы могут потреблять в памяти в несколько раз больше исходного файла. Измерения и ограничения зафиксированы в `PERFORMANCE.md`.
- Автоматизированная браузерная проверка выполняется в Chromium; smoke-проверка production-host в актуальных Chrome, Edge, Firefox и Safari остаётся частью Stage 11.
- Production deploy заблокирован внешней настройкой: у локального репозитория нет remote, а сохранённая GitHub CLI-сессия недействительна. Подготовлен GitHub Pages workflow и создан локальный тег `v1.0.0`; после выбора/подключения репозитория нужны push и smoke test production URL.
