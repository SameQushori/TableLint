import { inferSchema } from './inferSchema';

describe('inferSchema', () => {
  const headers = ['name', 'email', 'score', 'joined_at'];
  const rows = [
    ['Анна', 'anna@example.com', '10.5', '2025-01-12'],
    ['Борис', 'boris@example.com', '11', '2025-02-14'],
    ['Мария', 'maria@example.com', '9,5', '2025-03-01'],
  ];

  it('infers stable column types and confidence', () => {
    const first = inferSchema(headers, rows);
    const second = inferSchema(headers, rows);

    expect(first).toEqual(second);
    expect(first.map((column) => column.type)).toEqual([
      'string',
      'email',
      'number',
      'date',
    ]);
    expect(first.every((column) => column.confidence === 1)).toBe(true);
  });

  it('falls back to string for mixed values', () => {
    expect(inferSchema(['mixed'], [['1'], ['not-a-number']])[0]).toMatchObject({
      confidence: 1,
      type: 'string',
    });
  });

  it('keeps a useful inferred type when most sampled values match', () => {
    expect(
      inferSchema(
        ['email'],
        [
          ['anna@example.com'],
          ['broken.example.com'],
          ['boris@example.com'],
          ['maria@example.com'],
        ],
      )[0],
    ).toMatchObject({ confidence: 0.75, type: 'email' });
  });
});
