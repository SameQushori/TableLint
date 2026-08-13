# TableLint — план производства

## Протокол

- Одна фаза = один новый чат = один проверяемый результат.
- Перед изменениями необходимо прочитать всю документацию и `PROJECT_STATUS.md`.
- Активна только одна фаза. Будущие фазы не реализуются «заодно».
- В конце фазы запускаются перечисленные checks, вручную проверяется затронутый UI и обновляется status.
- Коммит рекомендуется делать после каждой принятой фазы: `stage-N: short outcome`.

## Stage 0 — repository foundation

Результат: запускаемый пустой product shell и инструменты качества.

Работы:

- Vite React TS strict;
- зависимости из `ARCHITECTURE.md` только необходимые для ближайших фаз;
- ESLint, Prettier, Vitest, Testing Library, Playwright skeleton;
- aliases, feature-oriented folders, design tokens, fonts without runtime third-party dependency;
- router и четыре guarded routes с временными осмысленными states;
- CI для typecheck, lint, test, build;
- перенести продуктовую документацию в repo.

Exit criteria: dev server и build работают; test/typecheck/lint проходят; 404/route refresh strategy документирована; `PROJECT_STATUS.md` обновлён.

## Stage 1 — visual system and application shell

Результат: узнаваемый адаптивный каркас TableLint без fake-функциональности.

Работы: tokens, typography, Button/Input/Dialog/Progress primitives, header, workflow stepper, focus/motion rules, responsive shell, Story/demo states для primitives.

Exit criteria: shell соответствует утверждённому макету на 1440/768/390; keyboard focus видим; reduced motion проверен; visual primitives покрыты smoke tests.

## Stage 2 — upload onboarding

Результат: пользователь выбирает реальный CSV или sample и получает валидированное состояние файла.

Работы: dropzone, picker, guards размера/формата, sample dataset, parsing/error/progress views пока через небольшой реальный parser adapter, переход setup.

Exit criteria: mouse/keyboard/drop работают; invalid/large/cancel cases показаны; raw content никуда не отправляется; integration tests основных состояний проходят.

## Stage 3 — worker parsing and schema inference

Результат: CSV разбирается вне main thread, а приложение предлагает схему.

Работы: versioned Worker contract, progress/cancel/stale response handling, delimiter/header detection, inference pure functions, Zod boundary, worker tests.

Exit criteria: sample и несколько fixtures корректно разбираются; UI остаётся отзывчивым; ошибки Worker восстанавливаемы; inference детерминирован.

## Stage 4 — rule setup

Результат: законченный второй шаг onboarding.

Работы: preview rows, column list, types/confidence, rule editor, validation настройки rules, responsive layout, persistence в workflow state.

Exit criteria: пользователь может изменить каждое правило из v1; invalid config блокирует scan с объяснением; reload/navigation не создаёт неконсистентное состояние.

## Stage 5 — validation engine and summary

Результат: настоящее сканирование выдаёт issues и quality score.

Работы: validators, issue model, unique indexes, severity, cancellation/progress, normalized issues state, score/selectors, unit fixtures.

Exit criteria: все правила имеют positive/negative/edge tests; одинаковый input даёт одинаковый output; scan sample создаёт ожидаемую сводку; нет full dataset logging.

## Stage 6 — virtualized data grid

Результат: центральная рабочая таблица с реальными данными и состояниями.

Работы: virtual rows, sticky header, column widths, selected cell, issue styling, loading/empty/error/clean views, desktop/tablet baseline.

Exit criteria: DOM остаётся ограниченным на большом fixture; scrolling не теряет соответствие строк; таблица читаема и клавиатурно достижима.

## Stage 7 — issue navigation and filtering

Результат: workspace становится инструментом поиска проблем.

Работы: left issue groups, right inspector, filters, next/previous, programmatic scroll/focus, URL-safe guards, drawers baseline.

Exit criteria: выбор issue всегда открывает правильную cell; filters/counts согласованы; zero-results и clean dataset обработаны.

## Stage 8 — editing, fix preview and undo

Результат: пользователь безопасно исправляет данные.

Работы: patch model, cell edit, fix planners, before/after preview, apply batch, undo/redo, selective fixes, localized revalidation, history limits.

Exit criteria: base rows не мутируются; каждый fix покрыт тестом обратимости; cancel preview не меняет данные; undo восстанавливает issues и score.

## Stage 9 — persistence and export

Результат: полный practical workflow завершён.

Работы: versioned IndexedDB session, recovery/clear UI, CSV export Worker, delimiter/quoting, CSV-injection protection option, JSON report, report screen.

Exit criteria: exported file повторно парсится с ожидаемыми значениями; report проходит Zod schema; reload recovery работает; stale schema migration безопасно сбрасывает session.

## Stage 10 — responsive, accessibility and resilience

Результат: продукт пригоден для публичного показа на разных устройствах.

Работы: mobile drawers, grid shortcuts, announcements, focus restore, error boundary, Worker crash/memory guidance, performance fixture, cross-browser polish.

Exit criteria: полный keyboard happy path; axe не показывает серьёзных нарушений; 1440/768/390 проверены; benchmark и известные ограничения записаны.

## Stage 11 — release and portfolio case study

Результат: публичный polished проект.

Работы: landing copy polish, privacy explanation, metadata/favicon/OG image, production deploy, E2E against preview, README case study, architecture diagram, demo GIF/video, seed example.

Exit criteria: production URL проходит smoke test; README ведёт на demo; репозиторий объясняет problem/solution/architecture/trade-offs; все CI checks зелёные; v1 tag создан после финальной проверки релиза.

## Stage 12 — power-user data workbench

Результат: TableLint ускоряет повторяющиеся проверки и массовую подготовку CSV, сохраняя локальную обработку, обратимость изменений и производительность на больших наборах данных.

### 12.1 Navigation and discovery

- command palette по `Ctrl/Cmd+K` с поиском по доступным действиям, подсказками shortcuts и корректным disabled-state;
- Excel-подобная навигация: `Enter` / `Shift+Enter`, `Tab` / `Shift+Tab`, `F2`, `Delete`, `Ctrl/Cmd+F`, `Ctrl/Cmd+H`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`;
- команды и shortcuts не срабатывают внутри текстовых полей, если это нарушает обычное редактирование;
- все действия доступны без мыши, имеют видимый focus и понятные announcements.

### 12.2 Search, filters and selection

- поиск по текущей колонке или всему dataset с переходом между совпадениями;
- replace one / replace all только через preview, с учетом регистра и режимом exact/contains;
- быстрые фильтры колонок: equals, not equals, contains, empty, not empty; несколько фильтров объединяются через AND и видны рядом с таблицей;
- выбор отдельных строк и всех строк текущего фильтра без создания копии dataset;
- массовая установка или очистка значения в выбранной колонке через preview;
- replace и batch edit создают typed patches и одну атомарную запись history для undo/redo.

### 12.3 Data insight and comparison

- профиль выбранной колонки: тип, количество заполненных/пустых/уникальных значений, issues и top values;
- расчёт профиля для больших данных выполняется вне main thread, поддерживает cancellation и stale-response guards;
- режим Original / Cleaned / Compare показывает исходное и эффективное значение без мутации и дублирования base rows;
- diff-фильтр позволяет показать только изменённые строки и перейти к следующему/предыдущему изменению.

### 12.4 Reusable rules and delivery

- локальные именованные presets правил в IndexedDB с versioned Zod schema;
- применение preset сопоставляет колонки по точному имени и заранее показывает missing/unmatched columns; частичное применение требует подтверждения;
- export settings: delimiter `,` / `;` / tab / `|`, UTF-8 или UTF-8 BOM, quoting policy, CSV-injection protection и формат дат `as edited` / `YYYY-MM-DD` / `DD.MM.YYYY` / `MM/DD/YYYY`;
- readiness screen перед экспортом показывает blockers, warnings, число issues и изменений, выбранные export settings и итог Ready / Needs review;
- readiness не скрывает проблемы и не меняет данные; экспорт при blockers требует явного подтверждения.

### Архитектурные ограничения

- base rows остаются неизменяемыми; все ручные, массовые и replace-операции представлены typed patches;
- Redux используется только для межэкранного workflow, query/selection и derived product state; состояние открытых popover/dialog остаётся локальным;
- тяжёлые profile/search/preview/export операции используют versioned Worker contracts и Zod validation на границах;
- presets и новые session-поля получают безопасную миграцию IndexedDB; неизвестная версия не приводит к частичному восстановлению;
- не добавляются backend, аккаунты, облачная синхронизация, AI, XLSX, аналитика с содержимым CSV или новые библиотеки без доказанной необходимости;
- строки, имена колонок и значения не логируются и не передаются по сети.

### Порядок реализации

1. keyboard contract и command palette;
2. search/replace и column filters;
3. row selection и batch edit;
4. column profile и Original/Cleaned/Compare;
5. rule presets;
6. export settings и readiness screen;
7. accessibility, responsive и performance regression pass.

Exit criteria: все перечисленные сценарии работают с мышью и клавиатурой; массовые изменения предварительно показываются и полностью отменяются одной операцией; фильтры, counts, selection и profile согласованы с patch overlay; presets переживают reload и безопасно обрабатывают несовпадающую схему; экспорт повторно парсится с выбранными delimiter/encoding/date settings; readiness точно отражает текущие issues и patches; axe не показывает серьёзных нарушений; 100k-row fixture не блокирует main thread; `format:check`, `typecheck`, `lint`, Vitest, Playwright и production build проходят; workspace проверен на 1440×900, 768×1024 и 390×844.

## Decision log

| Дата | Решение | Причина |
|---|---|---|
| Initial | Один stage на чат | Снижает context drift и делает статус проверяемым |
| Initial | Без backend | Все данные локальны; backend не даёт ценности v1 и ухудшает privacy/cost |
| Initial | Redux Toolkit без RTK Query | Есть сложный client workflow, но отсутствует server state |
| Initial | Base rows + patch overlay | Preview/undo без дорогих копий dataset |
| Initial | 50 MB limit | Честная граница browser-only первой версии; уточняется после benchmark |
| 2026-08-14 | Stage 12 остаётся browser-only | Power-user функции усиливают основной CSV workflow без backend, облака и передачи пользовательских данных |
