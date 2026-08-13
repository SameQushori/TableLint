# TableLint — performance notes

## Benchmark scenario

Stage 10 uses a browser-level fixture with 100,000 data rows and two columns:

- UTF-8 CSV generated in memory by Playwright;
- local File API input with no network requests;
- parsing and validation through the production Dedicated Worker;
- success when the validated workspace appears in under 60 seconds;
- fewer than 50 rendered data rows before and after `Ctrl+End`;
- final row identity remains `100000`.

Run it with:

```bash
npm run test:e2e -- --grep "100k-row benchmark"
```

The threshold is a regression guard, not a universal speed promise. Actual time
depends on CPU, available memory, browser, number of columns and enabled rules.
The complete Playwright benchmark test finished in approximately 6 seconds on
the Stage 10 reference environment on 2026-08-13.

## Browser compatibility

TableLint targets the current stable releases of Chrome, Edge, Firefox and
Safari. The implementation uses standards-based File, Dedicated Worker,
IndexedDB and Blob URL APIs, avoids browser-specific prefixes and includes
reduced-motion and keyboard fallbacks. The automated browser suite currently
runs on Chromium; production-host smoke checks remain part of Stage 11.

## Known limits

- The product guard remains 50 MB per CSV. A structurally wide file can require
  substantially more memory after parsing than its byte size on disk.
- Current v1 keeps parsed string rows in Redux and sends them to Workers using
  structured cloning. Very large or wide datasets may therefore use several
  times their file size in transient memory.
- If allocation fails, TableLint reports a recoverable memory-limit state and
  recommends closing other tabs or choosing a smaller file.
- The virtualized grid bounds rendered rows, but column count still affects
  the number of rendered cells in each visible row.
- Mobile supports viewing, issue navigation and export. Editing a large table
  remains optimized for desktop and tablet as defined in the product scope.

Moving full rows into an IndexedDB-backed repository remains an evidence-driven
future optimization; it is not required while this benchmark and the 50 MB
product boundary remain honest.
