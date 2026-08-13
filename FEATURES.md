# TableLint — функции и реализация

| ID | Функция | Пользовательское поведение | Реализация | Фаза |
|---|---|---|---|---:|
| F01 | Upload CSV | Dropzone, picker, ограничения и ошибки | File API; проверка MIME как подсказка, расширения и размера как реальные guard conditions | 2 |
| F02 | Sample dataset | Открыть продукт без своего файла | Версионируемый fixture, проходящий через тот же pipeline | 2 |
| F03 | Streaming parse | Прогресс без зависания UI | Papa Parse в dedicated Web Worker; сообщения progress/result/error | 3 |
| F04 | Schema inference | Предложенные типы и confidence | Чистые функции на sample значений; типы string/email/number/date | 3 |
| F05 | Rule editor | Включение и настройка правил колонки | React Hook Form не требуется: локальный draft + Zod schema; commit в Redux | 4 |
| F06 | Validation engine | Детерминированный список issues | Чистые валидаторы, индексы Map/Set для unique; исполнение в Worker | 5 |
| F07 | Quality summary | Score и группы проблем | Селекторы поверх нормализованных issues, документированная формула | 5 |
| F08 | Virtualized grid | Просмотр больших файлов | `@tanstack/react-virtual`; sticky header, семантические roles, column sizing | 6 |
| F09 | Issue navigation | Клик открывает строку и ячейку | Координаты issue → virtualizer.scrollToIndex → focus выбранной cell | 7 |
| F10 | Filters | All / issues / clean, rule and column filters | Мемоизированные row index lists; исходный массив не копируется целиком | 7 |
| F11 | Manual edit | Изменить отдельную ячейку | Patch operation `{rowId,columnId,before,after}`; локальная revalidation | 8 |
| F12 | Safe fix preview | Увидеть каждое предлагаемое изменение | Fix planners создают patches без применения; diff-panel группирует операции | 8 |
| F13 | Apply and undo | Применить/отменить изменения | Command history в Redux; ограниченная история; обратные patches | 8 |
| F14 | Session recovery | Вернуться после reload | IndexedDB через `idb`; versioned serialized session; explicit clear | 9 |
| F15 | CSV export | Скачать очищенный файл | Worker serializes с исходным delimiter/quoting policy; Blob + object URL | 9 |
| F16 | JSON report | Скачать результаты проверки | Zod-validated report schema с метаданными, counts и transformations | 9 |
| F17 | Responsive workspace | Работать на tablet/mobile | CSS grid; side panels как accessible dialogs/drawers; no second UI tree | 10 |
| F18 | Keyboard access | Пройти workflow без мыши | Native controls, roving focus для grid, shortcuts только как enhancement | 10 |
| F19 | Empty/loading/error | Понятное состояние на каждом шаге | Discriminated unions для async pipeline; error boundary для shell | 2–10 |
| F20 | Privacy proof | Понять, что файл локальный | Copy + отсутствие upload endpoint + optional offline behavior after load | 11 |
| F21 | Portfolio case study | Оценить инженерные решения | README: demo GIF, architecture, performance notes, trade-offs | 11 |

## Приоритеты

### Must

F01–F13, F15–F19 и F21. Без них проект не публикуется.

### Should

F14, F16 и F20. Они заметно усиливают продукт, но не должны задерживать исправление основного workflow.

### Won't in v1

Backend, auth, cloud sync, AI fixes, XLSX, collaboration, external data connectors, dashboards и billing.

## Правило реализации

Каждая функция проходит один и тот же вертикальный путь: domain model → состояние → UI states → tests → manual responsive check. Нельзя сначала собрать все экраны на моках, а затем пытаться встроить pipeline: главная портфельная ценность TableLint находится именно в настоящей обработке данных.

