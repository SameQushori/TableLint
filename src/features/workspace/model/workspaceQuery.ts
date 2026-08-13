import type { ValidationIssue } from '@entities/issue/model/types';
import {
  defaultIssueFilters,
  filterIssues,
  issueRuleTypes,
  type IssueFilters,
  type RowScope,
} from '@features/workspace/model/workspaceModel';

export interface WorkspaceLocation {
  filters: IssueFilters;
  selectedIssueId: string | null;
}

const rowScopes: RowScope[] = ['all', 'issues', 'clean'];

export function parseWorkspaceLocation(
  searchParams: URLSearchParams,
  issues: ValidationIssue[],
  columnIds: ReadonlySet<string>,
): WorkspaceLocation {
  const requestedScope = searchParams.get('rows');
  const requestedRule = searchParams.get('rule');
  const requestedColumn = searchParams.get('column');
  const filters: IssueFilters = {
    columnId:
      requestedColumn !== null && columnIds.has(requestedColumn)
        ? requestedColumn
        : null,
    rowScope: rowScopes.includes(requestedScope as RowScope)
      ? (requestedScope as RowScope)
      : defaultIssueFilters.rowScope,
    ruleType: issueRuleTypes.includes(
      requestedRule as ValidationIssue['ruleType'],
    )
      ? (requestedRule as ValidationIssue['ruleType'])
      : null,
  };
  const visibleIssues = filterIssues(issues, filters);
  const requestedIssueId = searchParams.get('issue');
  const selectedIssueId =
    requestedIssueId === null
      ? null
      : (visibleIssues.find((issue) => issue.id === requestedIssueId)?.id ??
        visibleIssues[0]?.id ??
        null);
  return { filters, selectedIssueId };
}

export function serializeWorkspaceLocation(location: WorkspaceLocation) {
  const params = new URLSearchParams();
  if (location.filters.rowScope !== 'all') {
    params.set('rows', location.filters.rowScope);
  }
  if (location.filters.ruleType) {
    params.set('rule', location.filters.ruleType);
  }
  if (location.filters.columnId) {
    params.set('column', location.filters.columnId);
  }
  if (location.selectedIssueId) {
    params.set('issue', location.selectedIssueId);
  }
  return params;
}
