export type InferredColumnType = 'string' | 'email' | 'number' | 'date';

export interface InferredColumn {
  confidence: number;
  header: string;
  id: string;
  type: InferredColumnType;
}

export type DateFormat =
  'YYYY-MM-DD' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'MM/DD/YYYY';

export type DecimalSeparator = '.' | ',';

export interface RuleSetupColumnDraft {
  columnId: string;
  type: InferredColumnType;
  rules: {
    allowedValues: { enabled: boolean; rawValues: string };
    date: { enabled: boolean; formats: DateFormat[] };
    email: { enabled: boolean };
    maxLength: { enabled: boolean; value: string };
    minLength: { enabled: boolean; value: string };
    number: { decimalSeparator: DecimalSeparator; enabled: boolean };
    required: { enabled: boolean };
    unique: { enabled: boolean };
  };
}

interface ValidationRuleBase {
  columnId: string;
  id: string;
}

export type ValidationRule =
  | (ValidationRuleBase & { type: 'required' })
  | (ValidationRuleBase & { type: 'unique' })
  | (ValidationRuleBase & { type: 'email' })
  | (ValidationRuleBase & {
      decimalSeparator: DecimalSeparator;
      type: 'number';
    })
  | (ValidationRuleBase & { formats: DateFormat[]; type: 'date' })
  | (ValidationRuleBase & { type: 'allowedValues'; values: string[] })
  | (ValidationRuleBase & { type: 'minLength'; value: number })
  | (ValidationRuleBase & { type: 'maxLength'; value: number });

export interface ConfiguredColumn {
  columnId: string;
  type: InferredColumnType;
}
