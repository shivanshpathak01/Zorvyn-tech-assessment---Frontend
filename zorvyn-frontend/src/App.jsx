import { useEffect, useMemo, useState } from 'react'
import { initialTransactions, roleOptions } from './data/mockData'

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' })

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)

const parseMonthKey = (inputDate) => {
  const date = new Date(inputDate)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const getSortedMonths = (transactions) => {
  const uniqueMonths = new Set(transactions.map((item) => parseMonthKey(item.date)))
  return [...uniqueMonths].sort((a, b) => a.localeCompare(b))
}

const getCategoryColor = (index) => {
  const palette = ['#12907A', '#E56A1C', '#2C66D1', '#8C4ED9', '#D74E82', '#008AAB', '#4B6A37']
  return palette[index % palette.length]
}

const emptyForm = {
  date: '',
  description: '',
  amount: '',
  category: '',
  type: 'expense'
}

function TrendChart({ trendData }) {
  const width = 560
  const height = 220
  const padding = 24

  if (!trendData.length) {
    return <p className="text-sm text-slate-500">No trend data available yet.</p>
  }

  const balances = trendData.map((item) => item.balance)
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = Math.max(max - min, 1)

  const points = trendData.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(trendData.length - 1, 1)
    const y = height - padding - ((item.balance - min) / range) * (height - padding * 2)
    return { ...item, x, y }
  })

  const areaPath = `${points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')} L ${points.at(-1).x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-slate-900">Balance Trend</h3>
      <p className="mt-1 text-sm text-slate-600">Monthly net movement based on current transactions.</p>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[520px] w-full">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12907A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#12907A" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendFill)" />
          <path d={linePath} fill="none" stroke="#12907A" strokeWidth="3" strokeLinecap="round" />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4" fill="#0A6F5F" />
              <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#334155">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function CategoryChart({ categoryData }) {
  const max = Math.max(...categoryData.map((item) => item.total), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <h3 className="font-['Space_Grotesk'] text-lg font-semibold text-slate-900">Spending Breakdown</h3>
      <p className="mt-1 text-sm text-slate-600">Expense categories with proportional share.</p>
      {!categoryData.length ? (
        <p className="mt-6 text-sm text-slate-500">No expenses available for category insights.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {categoryData.map((item, index) => {
            const widthPercent = (item.total / max) * 100
            return (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{item.category}</span>
                  <span className="text-slate-600">{formatCurrency(item.total)}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${widthPercent}%`, backgroundColor: getCategoryColor(index) }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function App() {
  const [role, setRole] = useState('viewer')
  const [transactions, setTransactions] = useState(() => {
    const stored = localStorage.getItem('finance-transactions')
    return stored ? JSON.parse(stored) : initialTransactions
  })

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    localStorage.setItem('finance-transactions', JSON.stringify(transactions))
  }, [transactions])

  const summary = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

    return {
      income,
      expenses,
      balance: income - expenses
    }
  }, [transactions])

  const trendData = useMemo(() => {
    const months = getSortedMonths(transactions)

    return months.map((month) => {
      const monthlyEntries = transactions.filter((item) => parseMonthKey(item.date) === month)
      const monthTotal = monthlyEntries.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0)

      return {
        key: month,
        label: monthFormatter.format(new Date(`${month}-01`)),
        balance: monthTotal
      }
    })
  }, [transactions])

  const categoryData = useMemo(() => {
    const grouped = transactions
      .filter((item) => item.type === 'expense')
      .reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount
        return acc
      }, {})

    return Object.entries(grouped)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
  }, [transactions])

  const categories = useMemo(
    () => ['all', ...new Set(transactions.map((item) => item.category).sort((a, b) => a.localeCompare(b)))],
    [transactions]
  )

  const filteredTransactions = useMemo(() => {
    const bySearch = transactions.filter((item) =>
      [item.description, item.category, item.type].join(' ').toLowerCase().includes(search.toLowerCase())
    )

    const byType = typeFilter === 'all' ? bySearch : bySearch.filter((item) => item.type === typeFilter)
    const byCategory = categoryFilter === 'all' ? byType : byType.filter((item) => item.category === categoryFilter)

    return [...byCategory].sort((a, b) => {
      if (sortBy === 'amount-desc') return b.amount - a.amount
      if (sortBy === 'amount-asc') return a.amount - b.amount
      if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date)
      return new Date(b.date) - new Date(a.date)
    })
  }, [transactions, search, typeFilter, categoryFilter, sortBy])

  const insights = useMemo(() => {
    if (!transactions.length) {
      return {
        highestCategory: 'N/A',
        highestCategoryAmount: 0,
        monthlyComparison: 'Not enough data',
        avgExpense: 0
      }
    }

    const topCategory = categoryData[0]

    const monthlyExpenseMap = transactions
      .filter((item) => item.type === 'expense')
      .reduce((acc, item) => {
        const key = parseMonthKey(item.date)
        acc[key] = (acc[key] || 0) + item.amount
        return acc
      }, {})

    const months = Object.keys(monthlyExpenseMap).sort((a, b) => a.localeCompare(b))
    const current = monthlyExpenseMap[months.at(-1)]
    const previous = monthlyExpenseMap[months.at(-2)]

    let monthlyComparison = 'Not enough data'
    if (current != null && previous != null) {
      const diff = current - previous
      const direction = diff > 0 ? 'up' : 'down'
      monthlyComparison = `${direction} ${formatCurrency(Math.abs(diff))} compared to last month`
    }

    const expenseEntries = transactions.filter((item) => item.type === 'expense')
    const avgExpense = expenseEntries.length
      ? expenseEntries.reduce((sum, item) => sum + item.amount, 0) / expenseEntries.length
      : 0

    return {
      highestCategory: topCategory?.category || 'N/A',
      highestCategoryAmount: topCategory?.total || 0,
      monthlyComparison,
      avgExpense
    }
  }, [transactions, categoryData])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (role !== 'admin') return

    const payload = {
      id: editingId || Date.now(),
      date: form.date,
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category.trim(),
      type: form.type
    }

    if (!payload.date || !payload.description || !payload.category || !payload.amount) {
      return
    }

    if (editingId) {
      setTransactions((prev) => prev.map((item) => (item.id === editingId ? payload : item)))
    } else {
      setTransactions((prev) => [payload, ...prev])
    }

    setForm(emptyForm)
    setEditingId(null)
  }

  const startEditing = (transaction) => {
    setEditingId(transaction.id)
    setForm({
      date: transaction.date,
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category,
      type: transaction.type
    })
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <section className="rounded-3xl border border-teal-100 bg-white/70 p-5 shadow-sm backdrop-blur md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium uppercase tracking-[0.2em] text-teal-700">Finance Dashboard</p>
            <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold text-slate-900 md:text-4xl">Spending & Cashflow Tracker</h1>
            <p className="mt-2 max-w-2xl text-slate-600">A clean, role-based frontend dashboard for reviewing balances, transactions, and actionable spending insights.</p>
          </div>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 md:w-72">
            <label className="text-sm font-medium text-slate-700" htmlFor="role">
              Active Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 outline-none transition focus:border-teal-500"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {role === 'viewer' ? 'Viewer mode: read-only access.' : 'Admin mode: add and edit transactions enabled.'}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Balance', value: summary.balance, tone: 'text-teal-700' },
          { label: 'Income', value: summary.income, tone: 'text-emerald-700' },
          { label: 'Expenses', value: summary.expenses, tone: 'text-orange-700' }
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-2 font-['Space_Grotesk'] text-3xl font-semibold ${card.tone}`}>{formatCurrency(card.value)}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <TrendChart trendData={trendData} />
        <CategoryChart categoryData={categoryData} />
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
        <article>
          <p className="text-sm text-slate-500">Highest Spending Category</p>
          <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold text-slate-900">{insights.highestCategory}</p>
          <p className="mt-1 text-sm text-slate-600">{formatCurrency(insights.highestCategoryAmount)}</p>
        </article>
        <article>
          <p className="text-sm text-slate-500">Monthly Comparison</p>
          <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold text-slate-900">{insights.monthlyComparison}</p>
        </article>
        <article>
          <p className="text-sm text-slate-500">Average Expense / Transaction</p>
          <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold text-slate-900">{formatCurrency(insights.avgExpense)}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search description/category/type"
            className="w-full flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-teal-500"
          />

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All Categories' : item}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Amount High to Low</option>
            <option value="amount-asc">Amount Low to High</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                {role === 'admin' && <th className="px-4 py-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {!filteredTransactions.length && (
                <tr>
                  <td colSpan={role === 'admin' ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                    No transactions match your filters.
                  </td>
                </tr>
              )}

              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{dateFormatter.format(new Date(transaction.date))}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{transaction.description}</td>
                  <td className="px-4 py-3 text-slate-700">{transaction.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        transaction.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {transaction.type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${transaction.type === 'income' ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  {role === 'admin' && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => startEditing(transaction)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-['Space_Grotesk'] text-2xl font-semibold text-slate-900">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
        <p className="mt-1 text-sm text-slate-600">Only admin can submit changes. Viewer mode keeps this form disabled.</p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            disabled={role !== 'admin'}
          />
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            disabled={role !== 'admin'}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="text"
            placeholder="Description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            disabled={role !== 'admin'}
          />
          <input
            type="text"
            placeholder="Category"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            disabled={role !== 'admin'}
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
            disabled={role !== 'admin'}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={role !== 'admin'}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {editingId ? 'Update Transaction' : 'Add Transaction'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}

export default App
