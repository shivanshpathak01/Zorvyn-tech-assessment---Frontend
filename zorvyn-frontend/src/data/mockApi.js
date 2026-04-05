import { initialTransactions } from './mockData'

const STORAGE_KEY = 'finance-transactions'
const NETWORK_DELAY = 450

let serverTransactions = null

const clone = (value) => JSON.parse(JSON.stringify(value))

const readStoredTransactions = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const writeStoredTransactions = (transactions) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
}

const ensureServerState = () => {
  if (!serverTransactions) {
    serverTransactions = readStoredTransactions() ?? initialTransactions
  }

  return serverTransactions
}

const persist = (transactions) => {
  serverTransactions = transactions
  writeStoredTransactions(transactions)
  return transactions
}

const delay = (payload) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(clone(payload)), NETWORK_DELAY)
  })

export const fetchTransactions = async () => delay(ensureServerState())

export const upsertTransaction = async (transaction) => {
  const current = ensureServerState()
  const exists = current.some((item) => item.id === transaction.id)

  const next = exists
    ? current.map((item) => (item.id === transaction.id ? transaction : item))
    : [transaction, ...current]

  return delay(persist(next))
}

export const removeTransaction = async (transactionId) => {
  const current = ensureServerState()
  const next = current.filter((item) => item.id !== transactionId)

  return delay(persist(next))
}
