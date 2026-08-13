export type IssueSeverity = 'error' | 'warning';

export type SuggestedFix =
  | { after: string; type: 'trim' }
  | { after: string; type: 'normalizeAllowedValue' }
  | { after: string; type: 'normalizeDate' };

export interface ValidationIssue {
  columnId: string;
  columnIndex: number;
  id: string;
  message: string;
  originalValue: string;
  rowId: string;
  rowIndex: number;
  ruleId: string;
  ruleType:
    | 'required'
    | 'unique'
    | 'email'
    | 'number'
    | 'date'
    | 'allowedValues'
    | 'minLength'
    | 'maxLength';
  severity: IssueSeverity;
  suggestedFix: SuggestedFix | null;
}

export interface ValidationSummary {
  errorCount: number;
  issueCount: number;
  nonEmptyCellCount: number;
  score: number;
  warningCount: number;
}
