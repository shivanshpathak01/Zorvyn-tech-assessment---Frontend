import { useEffect, useMemo, useState } from 'react'
import { fetchTransactions, removeTransaction, upsertTransaction } from './data/mockApi'
import { roleOptions } from './data/mockData'

const themeStorageKey = 'finance-theme'

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit'
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

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

const parseDate = (inputDate) => new Date(inputDate)

const getMonthLabel = (monthKey) => monthFormatter.format(new Date(`${monthKey}-01T00:00:00`))

const getCategoryColor = (index) => {
  const palette = ['#0F766E', '#EA580C', '#2563EB', '#7C3AED', '#DB2777', '#0891B2', '#4B5563']
  return palette[index % palette.length]
}

const emptyForm = {
  date: '',
  description: '',
  amount: '',
  category: '',
  type: 'expense'
}

const createDownload = (filename, content, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const matchesTimeScope = (dateValue, scope) => {
  if (scope === 'all') {
    return true
  }

  const targetDate = parseDate(dateValue)
  const now = new Date()
  const limit = new Date(now)

  if (scope === 'last30') {
    limit.setDate(limit.getDate() - 30)
  } else if (scope === 'last90') {
    limit.setDate(limit.getDate() - 90)
  } else if (scope === 'year') {
    limit.setFullYear(limit.getFullYear() - 1)
  }

  return targetDate >= limit
}

function TrendChart({ trendData, isDark }) {
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

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${
        isDark ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-slate-200 bg-white/80 text-slate-900'
      }`}
    >
      <h3 className="font-['Space_Grotesk'] text-lg font-semibold">Balance Trend</h3>
      <p className="mt-1 text-sm text-slate-500">Monthly net movement based on current transactions.</p>
      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[520px] w-full">
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F766E" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0F766E" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#trendFill)" />
          <path d={linePath} fill="none" stroke="#0F766E" strokeWidth="3" strokeLinecap="round" />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="4" fill="#115E59" />
              <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill={isDark ? '#CBD5E1' : '#334155'}>
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function CategoryChart({ categoryData, isDark }) {
  const max = Math.max(...categoryData.map((item) => item.total), 1)

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-colors duration-300 ${
        isDark ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-slate-200 bg-white/80 text-slate-900'
      }`}
    >
      <h3 className="font-['Space_Grotesk'] text-lg font-semibold">Spending Breakdown</h3>
      <p className="mt-1 text-sm text-slate-500">Expense categories with proportional share.</p>
      {!categoryData.length ? (
        <p className="mt-6 text-sm text-slate-500">No expenses available for category insights.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {categoryData.map((item, index) => {
            const widthPercent = (item.total / max) * 100

            return (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-slate-500">{formatCurrency(item.total)}</span>
                </div>
                <div className={`h-3 rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
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

function TransactionTable({ transactions, isDark, canEdit, onEdit, onDelete }) {
  const headClass = isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'
  const rowClass = isDark ? 'border-slate-800 hover:bg-slate-800/70' : 'border-slate-100 hover:bg-slate-50/80'
  const emptyCellClass = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`overflow-hidden rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className={headClass}>
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            {canEdit && <th className="px-4 py-3 font-medium">Action</th>}
          </tr>
        </thead>
        <tbody>
          {!transactions.length ? (
            <tr>
              <td colSpan={canEdit ? 6 : 5} className={`px-4 py-8 text-center ${emptyCellClass}`}>
                No transactions match your filters.
              </td>
            </tr>
          ) : (
            transactions.map((transaction) => (
              <tr key={transaction.id} className={`border-t ${rowClass} transition-colors`}>
                <td className="px-4 py-3 text-slate-500">{dateFormatter.format(new Date(transaction.date))}</td>
                <td className={`px-4 py-3 font-medium ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {transaction.description}
                </td>
                <td className="px-4 py-3 text-slate-500">{transaction.category}</td>
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
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(transaction)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(transaction.id)}
                        className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey)
    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [role, setRole] = useState('viewer')
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncMessage, setSyncMessage] = useState('Connecting to mock API...')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [timeScope, setTimeScope] = useState('all')
  const [sortBy, setSortBy] = useState('date-desc')
  const [groupBy, setGroupBy] = useState('none')

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(themeStorageKey, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    let isMounted = true

    const loadTransactions = async () => {
      setIsLoading(true)
      setSyncMessage('Connecting to mock API...')

      try {
        const data = await fetchTransactions()
        if (!isMounted) {
          return
        }

        setTransactions(data)
        setSyncMessage(`Loaded ${data.length} transactions from the mock API.`)
      } catch {
        if (isMounted) {
          setSyncMessage('Could not load mock API data. Using the last available state.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTransactions()

    return () => {
      isMounted = false
    }
  }, [])

  const isDark = theme === 'dark'

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
    const uniqueMonths = [...new Set(transactions.map((item) => parseMonthKey(item.date)))].sort((a, b) => a.localeCompare(b))

    return uniqueMonths.map((month) => {
      const monthlyEntries = transactions.filter((item) => parseMonthKey(item.date) === month)
      const monthTotal = monthlyEntries.reduce(
        (sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount),
        0
      )

      return {
        key: month,
        label: getMonthLabel(month),
        balance: monthTotal
      }
    })
  }, [transactions])

  const categoryData = useMemo(() => {
    const grouped = transactions
      .filter((item) => item.type === 'expense')
      .reduce((accumulator, item) => {
        accumulator[item.category] = (accumulator[item.category] || 0) + item.amount
        return accumulator
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
    const query = search.trim().toLowerCase()

    return transactions
      .filter((item) => [item.description, item.category, item.type].join(' ').toLowerCase().includes(query))
      .filter((item) => (typeFilter === 'all' ? true : item.type === typeFilter))
      .filter((item) => (categoryFilter === 'all' ? true : item.category === categoryFilter))
      .filter((item) => matchesTimeScope(item.date, timeScope))
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return b.amount - a.amount
        if (sortBy === 'amount-asc') return a.amount - b.amount
        if (sortBy === 'date-asc') return parseDate(a.date) - parseDate(b.date)
        return parseDate(b.date) - parseDate(a.date)
      })
  }, [transactions, search, typeFilter, categoryFilter, timeScope, sortBy])

  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          key: 'all',
          label: 'All Transactions',
          count: filteredTransactions.length,
          items: filteredTransactions,
          income: filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
          expenses: filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
        }
      ]
    }

    const groups = filteredTransactions.reduce((accumulator, item) => {
      const key = groupBy === 'month' ? parseMonthKey(item.date) : item.category

      if (!accumulator.has(key)) {
        accumulator.set(key, [])
      }

      accumulator.get(key).push(item)
      return accumulator
    }, new Map())

    return [...groups.entries()]
      .map(([key, items]) => {
        const income = items.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
        const expenses = items.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)

        return {
          key,
          label: groupBy === 'month' ? getMonthLabel(key) : key,
          count: items.length,
          items,
          income,
          expenses,
          sortKey: groupBy === 'month' ? key : key.toLowerCase()
        }
      })
      .sort((a, b) => {
        if (groupBy === 'month') return b.sortKey.localeCompare(a.sortKey)
        return a.sortKey.localeCompare(b.sortKey)
      })
  }, [filteredTransactions, groupBy])

  const insights = useMemo(() => {
    if (!transactions.length) {
      return {
        highestCategory: 'N/A',
        highestCategoryAmount: 0,
        monthlyComparison: 'Not enough data',
        avgExpense: 0,
        largestSingleExpense: 0
      }
    }

    const topCategory = categoryData[0]
    const expenseEntries = transactions.filter((item) => item.type === 'expense')
    const monthlyExpenseMap = expenseEntries.reduce((accumulator, item) => {
      const key = parseMonthKey(item.date)
      accumulator[key] = (accumulator[key] || 0) + item.amount
      return accumulator
    }, {})

    const months = Object.keys(monthlyExpenseMap).sort((a, b) => a.localeCompare(b))
    const latest = monthlyExpenseMap[months.at(-1)]
    const previous = monthlyExpenseMap[months.at(-2)]

    let monthlyComparison = 'Not enough data'
    if (latest != null && previous != null) {
      const diff = latest - previous
      monthlyComparison = `${diff > 0 ? 'up' : 'down'} ${formatCurrency(Math.abs(diff))} compared to last month`
    }

    return {
      highestCategory: topCategory?.category || 'N/A',
      highestCategoryAmount: topCategory?.total || 0,
      monthlyComparison,
      avgExpense: expenseEntries.length
        ? expenseEntries.reduce((sum, item) => sum + item.amount, 0) / expenseEntries.length
        : 0,
      largestSingleExpense: expenseEntries.length ? Math.max(...expenseEntries.map((item) => item.amount)) : 0
    }
  }, [transactions, categoryData])

  const activeTransactions = groupBy === 'none' ? filteredTransactions : groupedTransactions.flatMap((group) => group.items)

  const handleSaveTransaction = async (event) => {
    event.preventDefault()

    if (role !== 'admin') {
      return
    }

    const payload = {
      id: editingId || Date.now(),
      date: form.date,
      description: form.description.trim(),
      amount: Number(form.amount),
      category: form.category.trim(),
      type: form.type
    }

    if (!payload.date || !payload.description || !payload.category || !payload.amount) {
      setSyncMessage('Please complete all fields before saving.')
      return
    }

    setSyncMessage(editingId ? 'Updating transaction in mock API...' : 'Creating transaction in mock API...')

    try {
      const nextTransactions = await upsertTransaction(payload)
      setTransactions(nextTransactions)
      setForm(emptyForm)
      setEditingId(null)
      setSyncMessage(editingId ? 'Transaction updated successfully.' : 'Transaction added successfully.')
    } catch {
      setSyncMessage('Unable to save the transaction right now.')
    }
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (role !== 'admin') {
      return
    }

    if (typeof window !== 'undefined' && !window.confirm('Delete this transaction?')) {
      return
    }

    setSyncMessage('Deleting transaction from mock API...')

    try {
      const nextTransactions = await removeTransaction(transactionId)
      setTransactions(nextTransactions)
      if (editingId === transactionId) {
        setEditingId(null)
        setForm(emptyForm)
      }
      setSyncMessage('Transaction deleted successfully.')
    } catch {
      setSyncMessage('Unable to delete the transaction right now.')
    }
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
    setSyncMessage('Editing selected transaction.')
  }

  const handleExport = (format) => {
    if (!filteredTransactions.length) {
      setSyncMessage('No filtered transactions available to export.')
      return
    }

    const fileBase = `finance-transactions-${new Date().toISOString().slice(0, 10)}`

    if (format === 'csv') {
      const rows = [
        ['Date', 'Description', 'Category', 'Type', 'Amount'],
        ...filteredTransactions.map((item) => [item.date, item.description, item.category, item.type, item.amount])
      ]

      const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
      createDownload(`${fileBase}.csv`, csv, 'text/csv;charset=utf-8')
      setSyncMessage(`Exported ${filteredTransactions.length} transactions as CSV.`)
      return
    }

    createDownload(`${fileBase}.json`, JSON.stringify(filteredTransactions, null, 2), 'application/json;charset=utf-8')
    setSyncMessage(`Exported ${filteredTransactions.length} transactions as JSON.`)
  }

  const handleResetFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setTimeScope('all')
    setSortBy('date-desc')
    setGroupBy('none')
  }

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  const mainClass = isDark
    ? 'min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300'
    : 'min-h-screen bg-transparent text-slate-900 transition-colors duration-300'

  const shellClass = isDark
    ? 'rounded-3xl border border-slate-800 bg-slate-900/80 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur'
    : 'rounded-3xl border border-teal-100 bg-white/70 shadow-sm backdrop-blur'

  const cardClass = isDark
    ? 'rounded-2xl border border-slate-700 bg-slate-900/80 shadow-sm'
    : 'rounded-2xl border border-slate-200 bg-white shadow-sm'

  const inputClass = isDark
    ? 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-teal-400'
    : 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600'

  const selectClass = isDark
    ? 'rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-teal-400'
    : 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-teal-600'

  const actionButtonClass = isDark
    ? 'rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800'
    : 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100'

  return (
    <main className={mainClass}>
      <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
        <section className={`${shellClass} p-5 md:p-8`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium uppercase tracking-[0.2em] text-teal-700">Finance Dashboard</p>
              <h1 className="mt-2 font-['Space_Grotesk'] text-3xl font-bold md:text-4xl">Spending & Cashflow Tracker</h1>
              <p className={`mt-2 max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                A clean, role-based frontend dashboard for balances, transaction exploration, insights, and optional enhancement demos.
              </p>
            </div>

            <div className={`w-full rounded-2xl border p-4 md:w-[22rem] ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label className="text-sm font-medium text-slate-500" htmlFor="role">
                    Active Role
                  </label>
                  <select id="role" value={role} onChange={(event) => setRole(event.target.value)} className={`mt-2 w-full ${selectClass}`}>
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="button" onClick={toggleTheme} className={`${actionButtonClass} whitespace-nowrap`}>
                  {isDark ? 'Light mode' : 'Dark mode'}
                </button>
              </div>

              <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                {role === 'viewer'
                  ? 'Viewer mode: read-only access to the dashboard.'
                  : 'Admin mode: add, edit, and delete transactions.'}
              </div>
            </div>
          </div>

          <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-teal-950/70 text-teal-200' : 'bg-teal-50 text-teal-800'}`}>
            {syncMessage}
          </div>

          {isLoading && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className={`animate-pulse rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
                  <div className={`h-4 w-24 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                  <div className={`mt-4 h-8 w-32 rounded ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Total Balance', value: summary.balance, tone: 'text-teal-600' },
            { label: 'Income', value: summary.income, tone: 'text-emerald-600' },
            { label: 'Expenses', value: summary.expenses, tone: 'text-orange-600' }
          ].map((card) => (
            <article key={card.label} className={`${cardClass} p-5 transition-transform duration-300 hover:-translate-y-1`}>
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className={`mt-2 font-['Space_Grotesk'] text-3xl font-semibold ${card.tone}`}>{formatCurrency(card.value)}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <TrendChart trendData={trendData} isDark={isDark} />
          <CategoryChart categoryData={categoryData} isDark={isDark} />
        </section>

        <section className={`${cardClass} mt-6 grid gap-4 p-5 md:grid-cols-4`}>
          <article>
            <p className="text-sm text-slate-500">Highest Spending Category</p>
            <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold">{insights.highestCategory}</p>
            <p className="mt-1 text-sm text-slate-500">{formatCurrency(insights.highestCategoryAmount)}</p>
          </article>
          <article>
            <p className="text-sm text-slate-500">Monthly Comparison</p>
            <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold">{insights.monthlyComparison}</p>
          </article>
          <article>
            <p className="text-sm text-slate-500">Average Expense</p>
            <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold">{formatCurrency(insights.avgExpense)}</p>
          </article>
          <article>
            <p className="text-sm text-slate-500">Largest Expense</p>
            <p className="mt-1 font-['Space_Grotesk'] text-xl font-semibold">{formatCurrency(insights.largestSingleExpense)}</p>
          </article>
        </section>

        <section className={`${cardClass} mt-6 p-5`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-['Space_Grotesk'] text-2xl font-semibold">Transactions</h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Search, filter, group, and export the current dataset.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleExport('csv')} className={actionButtonClass}>
                Export CSV
              </button>
              <button type="button" onClick={() => handleExport('json')} className={actionButtonClass}>
                Export JSON
              </button>
              <button type="button" onClick={handleResetFilters} className={actionButtonClass}>
                Reset Filters
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search description, category, type"
              className={inputClass}
            />

            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={selectClass}>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === 'all' ? 'All Categories' : item}
                </option>
              ))}
            </select>

            <select value={timeScope} onChange={(event) => setTimeScope(event.target.value)} className={selectClass}>
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="year">Last 12 Months</option>
            </select>

            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={selectClass}>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount High to Low</option>
              <option value="amount-asc">Amount Low to High</option>
            </select>

            <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)} className={selectClass}>
              <option value="none">No Grouping</option>
              <option value="month">Group by Month</option>
              <option value="category">Group by Category</option>
            </select>
          </div>

          <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
            Showing {filteredTransactions.length} filtered records across {groupedTransactions.length} group(s).
          </div>

          <div className="mt-5 space-y-5">
            {groupBy === 'none' ? (
              <TransactionTable
                transactions={activeTransactions}
                isDark={isDark}
                canEdit={role === 'admin'}
                onEdit={startEditing}
                onDelete={handleDeleteTransaction}
              />
            ) : (
              groupedTransactions.map((group) => (
                <div key={group.key} className={`rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex flex-col gap-2 border-b border-slate-200/70 px-4 py-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h3 className="font-['Space_Grotesk'] text-lg font-semibold">{group.label}</h3>
                      <p className="text-sm text-slate-500">{group.count} transactions</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <span>Income: {formatCurrency(group.income)}</span>
                      <span>Expenses: {formatCurrency(group.expenses)}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <TransactionTable
                      transactions={group.items}
                      isDark={isDark}
                      canEdit={role === 'admin'}
                      onEdit={startEditing}
                      onDelete={handleDeleteTransaction}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={`${cardClass} mt-6 p-5`}>
          <h2 className="font-['Space_Grotesk'] text-2xl font-semibold">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Admin can create or update transactions. Viewer mode keeps the form disabled.
          </p>

          <form onSubmit={handleSaveTransaction} className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              className={inputClass}
              disabled={role !== 'admin'}
            />
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
              className={selectClass}
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
              className={inputClass}
              disabled={role !== 'admin'}
            />
            <input
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className={inputClass}
              disabled={role !== 'admin'}
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Amount"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className={inputClass}
              disabled={role !== 'admin'}
            />

            <div className="flex flex-wrap gap-2">
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
                  className={actionButtonClass}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default App