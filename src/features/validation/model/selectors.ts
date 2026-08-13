import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@app/store/store';
import { issuesSelectors } from '@features/validation/model/issuesSlice';

export const selectValidationSummary = (state: RootState) =>
  state.issues.summary;

export const selectIssueCountsByRule = createSelector(
  [issuesSelectors.selectAll],
  (issues) => {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.ruleType] = (counts[issue.ruleType] ?? 0) + 1;
    }
    return counts;
  },
);

export const selectIssueCountsByColumn = createSelector(
  [issuesSelectors.selectAll],
  (issues) => {
    const counts: Record<string, number> = {};
    for (const issue of issues) {
      counts[issue.columnId] = (counts[issue.columnId] ?? 0) + 1;
    }
    return counts;
  },
);
