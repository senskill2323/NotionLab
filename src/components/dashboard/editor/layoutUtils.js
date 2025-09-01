export const MAX_COLS_PER_ROW = 3;

export const normalizeRow = (row) => {
  if (!row || !row.columns || row.columns.length === 0) return row;
  
  const count = row.columns.length;
  
  const spans = {
    1: [12],
    2: [6, 6],
    3: [4, 4, 4],
  };

  const currentSpans = spans[count] || spans[MAX_COLS_PER_ROW];

  row.columns.forEach((col, index) => {
    col.span = currentSpans[index];
  });
  return row;
};