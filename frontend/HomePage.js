"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_USER_ID = 1;

const EMPTY_RECORD_FORM = {
  amount: "",
  type: "expense",
  category: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const EMPTY_USER_FORM = {
  name: "",
  email: "",
  role: "viewer",
  status: "active",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function monthLabel(value) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
  }).format(new Date(`${value}-01T00:00:00`));
}

export default function HomePage() {
  const [activeUserId, setActiveUserId] = useState(DEFAULT_USER_ID);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recordsState, setRecordsState] = useState({
    records: [],
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    categories: [],
  });
  const [filters, setFilters] = useState({
    type: "",
    category: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    page: 1,
  });
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) || null,
    [users, activeUserId],
  );

  const canViewRecords = activeUser?.role === "analyst" || activeUser?.role === "admin";
  const canManageRecords = activeUser?.role === "admin";
  const canManageUsers = activeUser?.role === "admin";

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-user-id": String(activeUserId),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  async function loadUsers() {
    const data = await request("/api/users");
    setUsers(data.users);
    return data.users;
  }

  async function loadSummary() {
    const data = await request("/api/dashboard/summary?months=6");
    setSummary(data.summary);
  }

  async function loadRecords(nextFilters = filters, role = activeUser?.role) {
    const hasRecordAccess = role === "analyst" || role === "admin";

    if (!hasRecordAccess) {
      setRecordsState((current) => ({
        ...current,
        records: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      }));
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(nextFilters.page || 1));
    params.set("pageSize", "10");

    ["type", "category", "dateFrom", "dateTo", "search"].forEach((key) => {
      if (nextFilters[key]) {
        params.set(key, nextFilters[key]);
      }
    });

    const data = await request(`/api/records?${params.toString()}`);
    setRecordsState({
      records: data.records,
      pagination: data.pagination,
      categories: data.categories,
    });
  }

  async function refreshDashboard({ keepMessage = true } = {}) {
    setIsRefreshing(true);

    try {
      const nextUsers = await loadUsers();
      const nextActor = nextUsers.find((user) => user.id === activeUserId) || null;
      await loadSummary();
      await loadRecords(filters, nextActor?.role);
      setError("");
      if (!keepMessage) {
        setFeedback("");
      }
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setIsRefreshing(false);
      setIsBooting(false);
    }
  }

  useEffect(() => {
    refreshDashboard({ keepMessage: false });
  }, [activeUserId]);

  useEffect(() => {
    if (isBooting || !activeUser) {
      return;
    }

    loadRecords(filters, activeUser.role).catch((loadError) =>
      setError(loadError.message),
    );
  }, [filters.page, activeUser?.role]);

  function resetRecordForm() {
    setRecordForm({
      ...EMPTY_RECORD_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditingRecordId(null);
  }

  async function handleRecordSubmit(event) {
    event.preventDefault();

    try {
      const payload = {
        amount: Number(recordForm.amount),
        type: recordForm.type,
        category: recordForm.category,
        date: recordForm.date,
        notes: recordForm.notes,
      };

      if (editingRecordId) {
        await request(`/api/records/${editingRecordId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setFeedback("Financial record updated successfully.");
      } else {
        await request("/api/records", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setFeedback("Financial record created successfully.");
      }

      resetRecordForm();
      await refreshDashboard();
    } catch (submitError) {
      setFeedback("");
      setError(submitError.message);
    }
  }

  async function handleRecordDelete(recordId) {
    try {
      await request(`/api/records/${recordId}`, { method: "DELETE" });
      if (editingRecordId === recordId) {
        resetRecordForm();
      }
      setFeedback("Financial record deleted successfully.");
      await refreshDashboard();
    } catch (deleteError) {
      setFeedback("");
      setError(deleteError.message);
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();

    try {
      await request("/api/users", {
        method: "POST",
        body: JSON.stringify(userForm),
      });
      setUserForm(EMPTY_USER_FORM);
      setFeedback("User created successfully.");
      await refreshDashboard();
    } catch (submitError) {
      setFeedback("");
      setError(submitError.message);
    }
  }

  async function handleUserUpdate(userId, patch) {
    try {
      await request(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setFeedback("User updated successfully.");
      await refreshDashboard();
    } catch (updateError) {
      setFeedback("");
      setError(updateError.message);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1 }));
    loadRecords({ ...filters, page: 1 }).catch((loadError) => setError(loadError.message));
  }

  const categoryLeaders = summary?.categoryTotals?.slice(0, 5) || [];
  const trend = summary?.trend || [];
  const maxTrendValue = Math.max(
    1,
    ...trend.flatMap((item) => [item.income, item.expense, Math.abs(item.net)]),
  );

  return (
    <main className="page-shell">
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Backend Assessment Submission</p>
          <h1>FinVeil Control Center</h1>
          <p className="hero-text">
            A role-aware finance dashboard built with Next.js and SQLite. The backend handles
            user management, financial records, summary analytics, validation, and permission
            checks, while the frontend demonstrates the workflow clearly for reviewers.
          </p>
          <div className="hero-metrics" aria-label="Live summary highlights">
            <div className="hero-metric-card">
              <span>Income</span>
              <strong>{formatCurrency(summary?.totals?.totalIncome || 0)}</strong>
            </div>
            <div className="hero-metric-card">
              <span>Expenses</span>
              <strong>{formatCurrency(summary?.totals?.totalExpenses || 0)}</strong>
            </div>
            <div className="hero-metric-card">
              <span>Net</span>
              <strong>{formatCurrency(summary?.totals?.netBalance || 0)}</strong>
            </div>
          </div>
        </div>

        <div className="identity-panel">
          <p className="eyebrow">Mock Access Context</p>
          <div className="identity-list">
            {users.map((user) => (
              <button
                key={user.id}
                className={`identity-chip ${user.id === activeUserId ? "active" : ""}`}
                onClick={() => {
                  setActiveUserId(user.id);
                  setFeedback("");
                  setError("");
                }}
                type="button"
              >
                <span>{user.name}</span>
                <small>
                  {formatRole(user.role)} · {user.status}
                </small>
              </button>
            ))}
          </div>
          {activeUser ? (
            <div className="identity-meta">
              <span className={`role-pill ${activeUser.role}`}>{formatRole(activeUser.role)}</span>
              <span className={`status-pill ${activeUser.status}`}>{activeUser.status}</span>
            </div>
          ) : null}
        </div>
      </section>

      {error ? <div className="message-banner error">{error}</div> : null}
      {feedback ? <div className="message-banner success">{feedback}</div> : null}

      <section className="grid-top">
        <div className="panel summary-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Dashboard Summary</p>
              <h2>Financial Snapshot</h2>
            </div>
            <button className="ghost-button" onClick={() => refreshDashboard()} type="button">
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="stat-grid">
            <article className="stat-card income">
              <span>Total Income</span>
              <strong>{formatCurrency(summary?.totals?.totalIncome || 0)}</strong>
            </article>
            <article className="stat-card expense">
              <span>Total Expenses</span>
              <strong>{formatCurrency(summary?.totals?.totalExpenses || 0)}</strong>
            </article>
            <article className="stat-card balance">
              <span>Net Balance</span>
              <strong>{formatCurrency(summary?.totals?.netBalance || 0)}</strong>
            </article>
            <article className="stat-card neutral">
              <span>Tracked Entries</span>
              <strong>
                {(summary?.breakdown?.incomeCount || 0) + (summary?.breakdown?.expenseCount || 0)}
              </strong>
            </article>
          </div>

          <div className="trend-grid">
            {trend.map((item) => (
              <div className="trend-card" key={item.month}>
                <div className="trend-bars">
                  <span
                    className="bar income"
                    style={{ height: `${Math.max(10, (item.income / maxTrendValue) * 120)}px` }}
                  />
                  <span
                    className="bar expense"
                    style={{ height: `${Math.max(10, (item.expense / maxTrendValue) * 120)}px` }}
                  />
                </div>
                <strong>{monthLabel(item.month)}</strong>
                <small>{formatCurrency(item.net)}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel side-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Aggregations</p>
              <h2>Category Totals</h2>
            </div>
          </div>
          <div className="leader-list">
            {categoryLeaders.map((item) => (
              <div className="leader-row" key={`${item.type}-${item.category}`}>
                <div>
                  <strong>{item.category}</strong>
                  <small>{formatRole(item.type)}</small>
                </div>
                <span>{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>
          <div className="recent-box">
            <p className="eyebrow">Recent Activity</p>
            {(summary?.recentActivity || []).map((item) => (
              <div className="recent-row" key={item.id}>
                <div>
                  <strong>{item.category}</strong>
                  <small>
                    {formatDate(item.date)} by {item.createdByName}
                  </small>
                </div>
                <span className={item.type === "income" ? "amount-positive" : "amount-negative"}>
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid-bottom">
        <div className="panel records-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Records</p>
              <h2>Financial Entries</h2>
            </div>
            <div className="hint-text">
              {canViewRecords
                ? "Analysts and admins can inspect filtered records."
                : "Viewer access is intentionally limited to dashboard summaries only."}
            </div>
          </div>

          {canViewRecords ? (
            <>
              <form className="filter-grid" onSubmit={applyFilters}>
                <input
                  className="input"
                  placeholder="Search notes"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
                <select
                  className="input"
                  value={filters.type}
                  onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                >
                  <option value="">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select
                  className="input"
                  value={filters.category}
                  onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                >
                  <option value="">All categories</option>
                  {recordsState.categories.map((item) => (
                    <option key={item.category} value={item.category}>
                      {item.category}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                />
                <input
                  className="input"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                />
                <button className="primary-button" type="submit">
                  Apply filters
                </button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Notes</th>
                      <th>Owner</th>
                      {canManageRecords ? <th>Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {recordsState.records.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.category}</td>
                        <td>
                          <span className={`inline-tag ${record.type}`}>{record.type}</span>
                        </td>
                        <td>{formatCurrency(record.amount)}</td>
                        <td>{record.notes || "-"}</td>
                        <td>{record.createdByName}</td>
                        {canManageRecords ? (
                          <td>
                            <div className="action-row">
                              <button
                                className="ghost-button small"
                                onClick={() => {
                                  setEditingRecordId(record.id);
                                  setRecordForm({
                                    amount: String(record.amount),
                                    type: record.type,
                                    category: record.category,
                                    date: record.date,
                                    notes: record.notes,
                                  });
                                }}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="danger-button small"
                                onClick={() => handleRecordDelete(record.id)}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination-row">
                <span>
                  Page {recordsState.pagination.page} of {recordsState.pagination.totalPages}
                </span>
                <div className="action-row">
                  <button
                    className="ghost-button small"
                    disabled={recordsState.pagination.page <= 1}
                    onClick={() =>
                      setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
                    }
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="ghost-button small"
                    disabled={recordsState.pagination.page >= recordsState.pagination.totalPages}
                    onClick={() =>
                      setFilters((current) => ({
                        ...current,
                        page: Math.min(recordsState.pagination.totalPages, current.page + 1),
                      }))
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="viewer-state">
              <h3>Viewer mode is active</h3>
              <p>
                This role can inspect high-level financial performance but cannot list or modify
                individual records. That restriction is enforced in the backend as well.
              </p>
            </div>
          )}
        </div>

        <div className="stack-column">
          <div className="panel form-panel">
            <div className="panel-head compact">
              <div>
                <p className="eyebrow">Admin Tools</p>
                <h2>{editingRecordId ? "Edit Record" : "Create Record"}</h2>
              </div>
            </div>
            {canManageRecords ? (
              <form className="form-grid" onSubmit={handleRecordSubmit}>
                <input
                  className="input"
                  placeholder="Amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recordForm.amount}
                  onChange={(event) => setRecordForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                />
                <select
                  className="input"
                  value={recordForm.type}
                  onChange={(event) => setRecordForm((current) => ({ ...current, type: event.target.value }))}
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <input
                  className="input"
                  placeholder="Category"
                  value={recordForm.category}
                  onChange={(event) => setRecordForm((current) => ({ ...current, category: event.target.value }))}
                  required
                />
                <input
                  className="input"
                  type="date"
                  value={recordForm.date}
                  onChange={(event) => setRecordForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
                <textarea
                  className="input textarea"
                  placeholder="Notes or description"
                  value={recordForm.notes}
                  onChange={(event) => setRecordForm((current) => ({ ...current, notes: event.target.value }))}
                />
                <div className="action-row">
                  <button className="primary-button" type="submit">
                    {editingRecordId ? "Save changes" : "Create record"}
                  </button>
                  {editingRecordId ? (
                    <button className="ghost-button" onClick={resetRecordForm} type="button">
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <p className="muted-copy">
                Only admins can create, update, or delete financial records.
              </p>
            )}
          </div>

          <div className="panel form-panel">
            <div className="panel-head compact">
              <div>
                <p className="eyebrow">User Control</p>
                <h2>Manage Access</h2>
              </div>
            </div>

            {canManageUsers ? (
              <>
                <form className="form-grid" onSubmit={handleCreateUser}>
                  <input
                    className="input"
                    placeholder="Full name"
                    value={userForm.name}
                    onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                  <input
                    className="input"
                    placeholder="Email address"
                    type="email"
                    value={userForm.email}
                    onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                  <select
                    className="input"
                    value={userForm.role}
                    onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="analyst">Analyst</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    className="input"
                    value={userForm.status}
                    onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button className="primary-button" type="submit">
                    Create user
                  </button>
                </form>

                <div className="user-admin-list">
                  {users.map((user) => (
                    <div className="user-admin-row" key={user.id}>
                      <div>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                      </div>
                      <div className="action-row wrap">
                        <select
                          className="input inline-select"
                          value={user.role}
                          onChange={(event) => handleUserUpdate(user.id, { role: event.target.value })}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="analyst">Analyst</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select
                          className="input inline-select"
                          value={user.status}
                          onChange={(event) => handleUserUpdate(user.id, { status: event.target.value })}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted-copy">Only admins can create users or change role assignments.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
