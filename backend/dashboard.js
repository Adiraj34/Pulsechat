import db, { ensureDatabaseReady } from "@/backend/db";
import { DEFAULT_SUMMARY_MONTHS, RECORD_TYPES } from "@/backend/constants";

function toAmount(value) {
  return Number((value / 100).toFixed(2));
}

export function getDashboardSummary({ months = DEFAULT_SUMMARY_MONTHS } = {}) {
  ensureDatabaseReady();
  const totals = db
    .prepare(
      `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents END), 0) AS total_income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS total_expense
        FROM financial_records
      `,
    )
    .get();

  const categoryTotals = db
    .prepare(
      `
        SELECT
          category,
          type,
          SUM(amount_cents) AS total_amount_cents
        FROM financial_records
        GROUP BY category, type
        ORDER BY total_amount_cents DESC, category COLLATE NOCASE ASC
      `,
    )
    .all()
    .map((row) => ({
      category: row.category,
      type: row.type,
      total: toAmount(row.total_amount_cents),
    }));

  const recentActivity = db
    .prepare(
      `
        SELECT
          r.id,
          r.type,
          r.category,
          r.amount_cents,
          r.record_date,
          r.notes,
          u.name AS created_by_name
        FROM financial_records r
        JOIN users u ON u.id = r.created_by_user_id
        ORDER BY r.record_date DESC, r.id DESC
        LIMIT 5
      `,
    )
    .all()
    .map((row) => ({
      id: row.id,
      type: row.type,
      category: row.category,
      amount: toAmount(row.amount_cents),
      date: row.record_date,
      notes: row.notes,
      createdByName: row.created_by_name,
    }));

  const trendRows = db
    .prepare(
      `
        SELECT
          strftime('%Y-%m', record_date) AS month,
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount_cents END), 0) AS income_cents,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_cents END), 0) AS expense_cents
        FROM financial_records
        WHERE record_date >= date('now', ?)
        GROUP BY strftime('%Y-%m', record_date)
        ORDER BY month ASC
      `,
    )
    .all(`-${Math.max(1, months) - 1} months`)
    .map((row) => ({
      month: row.month,
      income: toAmount(row.income_cents),
      expense: toAmount(row.expense_cents),
      net: toAmount(row.income_cents - row.expense_cents),
    }));

  const totalIncome = toAmount(totals.total_income);
  const totalExpenses = toAmount(totals.total_expense);

  return {
    totals: {
      totalIncome,
      totalExpenses,
      netBalance: Number((totalIncome - totalExpenses).toFixed(2)),
    },
    categoryTotals,
    recentActivity,
    trend: trendRows,
    breakdown: {
      incomeCount: db
        .prepare("SELECT COUNT(*) AS count FROM financial_records WHERE type = ?")
        .get(RECORD_TYPES.INCOME).count,
      expenseCount: db
        .prepare("SELECT COUNT(*) AS count FROM financial_records WHERE type = ?")
        .get(RECORD_TYPES.EXPENSE).count,
    },
  };
}
