import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { LanguageContext, type AppLanguage } from '@shared/lib/languageContext';

const LANGUAGE_STORAGE_KEY = 'tablelint-language';

const englishByRussian: Readonly<Record<string, string>> = {
  'TableLint, на главную': 'TableLint, home',
  'Файлы остаются на устройстве': 'Files stay on your device',
  'Включить тёмную тему': 'Switch to dark theme',
  'Включить светлую тему': 'Switch to light theme',
  'Выбор языка': 'Language selection',
  Загрузка: 'Upload',
  Правила: 'Rules',
  Проверка: 'Review',
  Результат: 'Result',
  'Этапы проверки CSV': 'CSV review steps',
  'TableLint · локальная проверка CSV': 'TableLint · local CSV validation',
  'Без аккаунта и отправки данных': 'No account or data upload',
  'Подготовка данных · шаг 01': 'Data preparation · step 01',
  'Проверьте CSV до импорта': 'Check your CSV before import',
  'Найдите пропуски, дубликаты и неверные форматы — спокойно, последовательно и без отправки файла на сервер.':
    'Find missing values, duplicates, and invalid formats in a clear workflow without uploading your file.',
  'Всё происходит на этом устройстве. Содержимое файла не отправляется по сети.':
    'Everything runs on this device. File contents are never sent over the network.',
  'Выберите исходный файл': 'Choose a source file',
  'Перетащите CSV сюда': 'Drop a CSV here',
  'или выберите его с устройства. Принимается один файл.':
    'or choose one from your device. One file at a time.',
  'CSV файл на устройстве': 'CSV file on this device',
  'Выбрать CSV': 'Choose CSV',
  'Файл не принят': 'File not accepted',
  'Выбрать другой': 'Choose another',
  'Открыть пример': 'Open sample',
  'Перед началом': 'Before you start',
  'Формат CSV в кодировке UTF-8 или UTF-8 BOM':
    'CSV encoded as UTF-8 or UTF-8 BOM',
  'Размер файла — не больше 50 МБ': 'File size up to 50 MB',
  'Чтение выполняется через File API без upload endpoint':
    'Read through the File API with no upload endpoint',
  'Нет файла под рукой?': 'No file at hand?',
  'Откройте небольшой пример с типичными проблемами. Он проходит тот же локальный pipeline.':
    'Open a small sample with common issues. It uses the same local pipeline.',
  'Использовать пример': 'Use sample',
  'Схема CSV определена': 'CSV schema detected',
  'Разбираем структуру CSV': 'Reading CSV structure',
  'Анализ структуры · шаг 02': 'Structure analysis · step 02',
  'Dedicated Worker определяет разделитель, проверяет заголовки и предлагает типы колонок, не блокируя интерфейс.':
    'A dedicated worker detects the delimiter, validates headers, and suggests column types without blocking the interface.',
  'Локальная сессия': 'Local session',
  'Worker анализирует CSV': 'Worker is analyzing the CSV',
  'Интерфейс остаётся доступным во время обработки.':
    'The interface stays responsive during processing.',
  'Разбор CSV': 'Parsing CSV',
  'Отменить анализ': 'Cancel analysis',
  'Анализ не завершён': 'Analysis not completed',
  Повторить: 'Retry',
  'Другой файл': 'Another file',
  'Исходный файл больше недоступен. Выберите его снова.':
    'The source file is no longer available. Choose it again.',
  'Разбор отменён. Можно запустить его снова.':
    'Parsing was cancelled. You can start it again.',
  'Не удалось обработать CSV. Попробуйте ещё раз.':
    'Could not process the CSV. Please try again.',
  'Настройка правил · шаг 02': 'Rule setup · step 02',
  'Подтвердите схему': 'Confirm the schema',
  'Проверьте первые строки, уточните типы и включите правила перед локальным сканированием.':
    'Review the first rows, refine types, and enable rules before the local scan.',
  'Сводка файла': 'File summary',
  'Первые строки': 'First rows',
  пусто: 'empty',
  'Колонки и правила': 'Columns and rules',
  'Изменения сохраняются в текущей сессии':
    'Changes are saved in the current session',
  'Проверку пока нельзя запустить': 'The scan cannot start yet',
  'Колонки CSV': 'CSV columns',
  Колонка: 'Column',
  'Тип данных': 'Data type',
  Текст: 'Text',
  Число: 'Number',
  Дата: 'Date',
  'Обязательное значение': 'Required value',
  'Значение не пустое после удаления крайних пробелов.':
    'Value is not empty after trimming.',
  'Уникальное значение': 'Unique value',
  'Непустое значение не повторяется в колонке.':
    'A non-empty value does not repeat in the column.',
  'Формат email': 'Email format',
  'Практическая проверка структуры email.':
    'Practical email structure validation.',
  'Формат числа': 'Number format',
  'Конечное число с выбранным десятичным знаком.':
    'A finite number with the selected decimal separator.',
  'Десятичный знак': 'Decimal separator',
  'Точка (12.5)': 'Period (12.5)',
  'Запятая (12,5)': 'Comma (12,5)',
  'Формат даты': 'Date format',
  'Значение соответствует одному из явных форматов.':
    'Value matches one of the explicit formats.',
  'Допустимые форматы': 'Accepted formats',
  'Разрешённые значения': 'Allowed values',
  'Значение входит в заданный список без повторов.':
    'Value belongs to the deduplicated list.',
  'По одному значению на строку': 'One value per line',
  'Минимальная длина': 'Minimum length',
  'Минимальная длина нормализованной строки.':
    'Minimum normalized string length.',
  'Максимальная длина': 'Maximum length',
  'Максимальная длина нормализованной строки.':
    'Maximum normalized string length.',
  Символов: 'Characters',
  Б: 'B',
  КБ: 'KB',
  МБ: 'MB',
  строк: 'rows',
  колонок: 'columns',
  'строк ·': 'rows ·',
  из: 'of',
  'правил включено': 'rules enabled',
  'Исходные строки остаются без изменений.': 'Source rows remain unchanged.',
  'Запустить проверку': 'Run scan',
  'Сканирование завершено': 'Scan complete',
  'CSV готов к работе': 'CSV is ready to work with',
  'Проверка данных · шаг 03': 'Data validation · step 03',
  'проверяется локально в Dedicated Worker. Исходные значения остаются без изменений.':
    'is validated locally in a dedicated worker. Source values remain unchanged.',
  'Проверяем каждую строку': 'Checking every row',
  'Worker выполняет проверку': 'Worker is validating rows',
  'Строим уникальные индексы, применяем правила и считаем quality score.':
    'Building unique indexes, applying rules, and calculating the quality score.',
  'Проверка строк CSV': 'Validating CSV rows',
  'Отменить проверку': 'Cancel scan',
  'Проверка отменена': 'Scan cancelled',
  'Проверка не завершена': 'Scan not completed',
  'Можно запустить сканирование заново без повторной настройки правил.':
    'You can rerun the scan without configuring the rules again.',
  'Повторить проверку': 'Retry scan',
  'Строки файла не отправляются и не журналируются':
    'File rows are never uploaded or logged',
  'Результат проверки': 'Validation result',
  Качество: 'Quality',
  'Error весит 1, warning — 0,35. Вес проблем делится на':
    'Errors weigh 1 and warnings 0.35. Issue weight is divided by',
  'непустых ячеек; результат округлён до целого.':
    'non-empty cells and rounded to an integer.',
  Ошибки: 'Errors',
  Предупреждения: 'Warnings',
  Строки: 'Rows',
  'Файл обрабатывается локально': 'File is processed locally',
  'Разделы рабочей области': 'Workspace sections',
  'Строка редактирования': 'Edit bar',
  'Выберите ячейку для редактирования': 'Select a cell to edit',
  'Редактор CSV': 'CSV editor',
  'Закрыть диалог': 'Close dialog',
  '04 · Данные': '04 · Data',
  'Ячейки с проблемами отмечены цветом. Стрелки перемещают по ячейкам, Home/End — по строке, Ctrl+Home/End — к началу или концу, Page Up/Down — на десять строк. Enter открывает редактирование.':
    'Issue cells are highlighted. Arrow keys move between cells, Home/End move across a row, Ctrl+Home/End jump to the beginning or end, Page Up/Down move ten rows, and Enter starts editing.',
  'Экспорт результата': 'Result export',
  '04 · Экспорт': '04 · Export',
  'Правки сохранены локально': 'Changes are saved locally',
  'Перейдите к cleaned CSV и проверяемому JSON-отчёту.':
    'Continue to the cleaned CSV and verifiable JSON report.',
  'Данные CSV': 'CSV data',
  'Строки CSV': 'CSV rows',
  Данные: 'Data',
  Проблемы: 'Issues',
  История: 'History',
  'История правок': 'Edit history',
  'Все строки': 'All rows',
  'С проблемами': 'With issues',
  'Без проблем': 'Clean',
  'Нет совпадений': 'No matches',
  'Проблем не найдено': 'No issues found',
  'Проблемы по текущим фильтрам': 'Issues matching current filters',
  'Группы проблем': 'Issue groups',
  'Закрыть группы проблем': 'Close issue groups',
  'Следующая проблема': 'Next issue',
  'Предыдущая проблема': 'Previous issue',
  'Редактировать значение': 'Edit value',
  'Значение выбранной ячейки': 'Selected cell value',
  'Изменения данных': 'Data changes',
  'Обратимые изменения': 'Reversible changes',
  'Base rows не изменены': 'Base rows unchanged',
  'Preview безопасных исправлений': 'Preview safe fixes',
  'Проверьте before/after. Удаление строк требует отдельного выбора.':
    'Review before and after values. Row removal requires explicit selection.',
  'Отменить preview': 'Cancel preview',
  'Применить выбранные': 'Apply selected',
  'Строка останется в base data и будет скрыта overlay‑патчем.':
    'The row remains in base data and is hidden by an overlay patch.',
  'Перейти к экспорту': 'Continue to export',
  'Готовность данных · шаг 04': 'Data readiness · step 04',
  'Файлы готовы к передаче': 'Files are ready',
  'Cleaned CSV сохраняет исходный разделитель и добавляет UTF-8 BOM для корректного открытия кириллицы в табличных редакторах, а JSON фиксирует score, counts и применённые преобразования.':
    'The cleaned CSV preserves the source delimiter and adds a UTF-8 BOM, while JSON records the score, counts, and applied transformations.',
  'Экспорт создаётся локально в Dedicated Worker.':
    'Export is generated locally in a dedicated worker.',
  '01 · Параметры': '01 · Options',
  'Совместимость CSV': 'CSV compatibility',
  'Только когда требуется': 'Only when required',
  'Все значения': 'All values',
  'Защищать значения, начинающиеся с =, +, − или @, ведущим апострофом':
    'Protect values beginning with =, +, −, or @ with a leading apostrophe',
  'Пересобрать файлы': 'Regenerate files',
  Разделитель: 'Delimiter',
  '02 · Итог': '02 · Summary',
  'Отчёт проверки': 'Validation report',
  'Подготовка экспорта': 'Preparing export',
  Исправлено: 'Fixed',
  Осталось: 'Remaining',
  'Применённые преобразования': 'Applied transformations',
  'Изменения не применялись': 'No changes applied',
  'Скачать cleaned CSV': 'Download cleaned CSV',
  'Скачать JSON-отчёт': 'Download JSON report',
  'Вернуться в workspace': 'Return to workspace',
  'Удалить локальную сессию': 'Delete local session',
  'Не удалось подготовить экспорт.': 'Could not prepare the export.',
  'Восстановить последнюю сессию?': 'Restore the last session?',
  'Данные хранятся только в IndexedDB этого браузера. Можно продолжить работу или безвозвратно удалить локальную копию.':
    'Data is stored only in this browser’s IndexedDB. Continue working or permanently delete the local copy.',
  Файл: 'File',
  Сохранено: 'Saved',
  'Осталось проблем': 'Issues remaining',
  Восстановить: 'Restore',
  'Локальная ошибка': 'Local error',
  'TableLint не смог продолжить': 'TableLint could not continue',
  'Перезагрузите приложение и восстановите последнюю локальную сессию. Если ошибка повторяется на большом файле, попробуйте CSV меньшего размера. Содержимое файла не отправлялось по сети.':
    'Reload the app and restore the latest local session. If the error repeats with a large file, try a smaller CSV. File contents were never sent over the network.',
  'Перезагрузить приложение': 'Reload application',
};

function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'ru';
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'en'
      ? 'en'
      : 'ru';
  } catch {
    return 'ru';
  }
}

function translateDynamicText(value: string) {
  const replacements: ReadonlyArray<[RegExp, string]> = [
    [/^(\d+) проблем найдено$/u, '$1 issues found'],
    [/^(\d+) проблема найдена$/u, '$1 issue found'],
    [/^(\d+) строк$/u, '$1 rows'],
    [/^(\d+) колонок$/u, '$1 columns'],
    [/^(\d+) правил включено$/u, '$1 rules enabled'],
    [/^(\d+) batch в истории$/u, '$1 batches in history'],
    [/^Предложено (\d+); выбрано (\d+)\.$/u, '$1 suggested; $2 selected.'],
    [/^Строка (\d+)$/u, 'Row $1'],
    [/^строка (\d+)$/u, 'row $1'],
  ];
  let translated = value;
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(translated))
      translated = translated.replace(pattern, replacement);
  }
  return translated
    .replace(
      /(.+\.csv) проверяется локально в Dedicated Worker\. Исходные значения остаются без изменений\./gu,
      '$1 is validated locally in a dedicated worker. Source values remain unchanged.',
    )
    .replace(
      /Error весит 1, warning — 0,35\. Вес проблем делится на (\d+) непустых ячеек; результат округлён до целого\./gu,
      'Errors weigh 1 and warnings 0.35. Issue weight is divided by $1 non-empty cells and rounded to an integer.',
    )
    .replace(/(\d+(?:\.\d+)?) МБ/gu, '$1 MB')
    .replace(/(\d+(?:\.\d+)?) КБ/gu, '$1 KB')
    .replace(/(\d+(?:\.\d+)?) Б/gu, '$1 B')
    .replace(/(\d+) строк/gu, '$1 rows')
    .replace(/(\d+) колонок/gu, '$1 columns')
    .replace(/(\d+) из (\d+)/gu, '$1 of $2')
    .replace(/(\d+) правил включено/gu, '$1 rules enabled')
    .replace(/строка (\d+)/gu, 'row $1')
    .replace(/(\d+) проблем[а-я]*/gu, '$1 issues')
    .replace(/, ошибка/gu, ', error')
    .replace(/пусто/gu, 'empty');
}

function translateInterfaceText(value: string, language: AppLanguage) {
  if (language === 'ru') return value;
  return englishByRussian[value] ?? translateDynamicText(value);
}

function LanguageDomBridge({ language }: { language: AppLanguage }) {
  useLayoutEffect(() => {
    const attributes = ['aria-label', 'placeholder', 'title'] as const;
    let translating = false;

    const translateTree = (root: ParentNode) => {
      if (translating) return;
      translating = true;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (parent && !['SCRIPT', 'STYLE'].includes(parent.tagName)) {
          const source = textNode.data;
          if (source.trim().length === 0) {
            node = walker.nextNode();
            continue;
          }
          const leading = source.match(/^\s*/u)?.[0] ?? '';
          const trailing = source.match(/\s*$/u)?.[0] ?? '';
          const core = source.slice(
            leading.length,
            source.length - trailing.length,
          );
          const translated = translateInterfaceText(core, language);
          const nextValue = `${leading}${translated}${trailing}`;
          if (textNode.data !== nextValue) textNode.data = nextValue;
        }
        node = walker.nextNode();
      }

      const elements =
        root instanceof Element
          ? [root, ...root.querySelectorAll('*')]
          : root.querySelectorAll('*');
      for (const element of elements) {
        for (const attribute of attributes) {
          const current = element.getAttribute(attribute);
          if (current === null) continue;
          const translated = translateInterfaceText(current, language);
          if (current !== translated)
            element.setAttribute(attribute, translated);
        }
      }
      translating = false;
    };

    translateTree(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData' && record.target.parentNode) {
          translateTree(record.target.parentNode);
        }
        if (record.type === 'attributes' && record.target instanceof Element) {
          translateTree(record.target);
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) translateTree(node);
          else if (node instanceof Text && node.parentNode)
            translateTree(node.parentNode);
        }
      }
    });
    observer.observe(document.body, {
      characterData: true,
      attributes: true,
      attributeFilter: [...attributes],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<AppLanguage>(readStoredLanguage);
  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // The language still changes for this session when storage is unavailable.
    }
  }, []);
  const contextValue = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={contextValue}>
      <LanguageDomBridge language={language} />
      <Fragment key={language}>{children}</Fragment>
    </LanguageContext.Provider>
  );
}
