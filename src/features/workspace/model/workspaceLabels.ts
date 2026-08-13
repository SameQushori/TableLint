import type { ValidationIssue } from '@entities/issue/model/types';

export const RULE_LABELS: Record<ValidationIssue['ruleType'], string> = {
  allowedValues: 'Разрешённые значения',
  date: 'Формат даты',
  email: 'Формат email',
  maxLength: 'Максимальная длина',
  minLength: 'Минимальная длина',
  number: 'Формат числа',
  required: 'Обязательное значение',
  unique: 'Уникальное значение',
};
