import { useState, useEffect, useRef } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Download, Edit2, Trash2, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  time: string;
  note?: string;
}

interface HistoryItem {
  name: string;
  lastPrice: number;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [itemName, setItemName] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  
  // Auto-suggest state
  const [suggestions, setSuggestions] = useState<HistoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load transactions and history from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('cashflow-transactions');
    const savedHistory = localStorage.getItem('cashflow-history');
    
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save transactions to localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('cashflow-transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpense;

  // Handle item name input with auto-uppercase
  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setItemName(value);

    // Filter suggestions
    if (value.length > 0) {
      const filtered = history.filter(item =>
        item.name.includes(value)
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle amount input (auto-uppercase not needed for numbers)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (item: HistoryItem) => {
    setItemName(item.name);
    setAmount(item.lastPrice.toString());
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Add or update transaction
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim() || !amount || parseFloat(amount) <= 0) {
      return;
    }

    const now = new Date();
    const transaction: Transaction = {
      id: editingId || Date.now().toString(),
      name: itemName.trim(),
      amount: parseFloat(amount),
      type: transactionType,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined
    };

    if (editingId) {
      // Update existing transaction
      setTransactions(prev => prev.map(t => t.id === editingId ? transaction : t));
      setEditingId(null);
    } else {
      // Add new transaction
      setTransactions(prev => [transaction, ...prev]);
    }

    // Update history
    const existingHistoryIndex = history.findIndex(h => h.name === itemName.trim());
    if (existingHistoryIndex >= 0) {
      const updatedHistory = [...history];
      updatedHistory[existingHistoryIndex].lastPrice = parseFloat(amount);
      setHistory(updatedHistory);
      localStorage.setItem('cashflow-history', JSON.stringify(updatedHistory));
    } else {
      const newHistory = [...history, { name: itemName.trim(), lastPrice: parseFloat(amount) }];
      setHistory(newHistory);
      localStorage.setItem('cashflow-history', JSON.stringify(newHistory));
    }

    // Reset form
    setItemName('');
    setAmount('');
    setTransactionType('income');
    setNote('');
    setShowSuggestions(false);
  };

  // Edit transaction
  const handleEdit = (transaction: Transaction) => {
    setItemName(transaction.name);
    setAmount(transaction.amount.toString());
    setTransactionType(transaction.type);
    setEditingId(transaction.id);
    setNote(transaction.note || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete transaction
  const handleDelete = (id: string) => {
    if (window.confirm('Hapus transaksi ini?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setItemName('');
    setAmount('');
    setTransactionType('income');
    setNote('');
  };

  // Export to Excel
  const handleExport = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');

    // Prepare data for export
    const exportData = transactions.map(t => ({
      'TANGGAL': t.date,
      'WAKTU': t.time,
      'NAMA BARANG/JASA': t.name,
      'CATATAN': t.note || '',
      'NOMINAL': t.amount,
      'JENIS': t.type === 'income' ? 'PEMASUKAN' : 'PENGELUARAN'
    }));

    // Add summary at the end
    exportData.push({
      'TANGGAL': '',
      'WAKTU': '',
      'NAMA BARANG/JASA': '',
      'CATATAN': '',
      'NOMINAL': 0,
      'JENIS': ''
    });
    exportData.push({
      'TANGGAL': '',
      'WAKTU': 'TOTAL PEMASUKAN',
      'NAMA BARANG/JASA': '',
      'CATATAN': '',
      'NOMINAL': totalIncome,
      'JENIS': ''
    });
    exportData.push({
      'TANGGAL': '',
      'WAKTU': 'TOTAL PENGELUARAN',
      'NAMA BARANG/JASA': '',
      'CATATAN': '',
      'NOMINAL': totalExpense,
      'JENIS': ''
    });
    exportData.push({
      'TANGGAL': '',
      'WAKTU': 'SALDO',
      'NAMA BARANG/JASA': '',
      'CATATAN': '',
      'NOMINAL': balance,
      'JENIS': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

    XLSX.writeFile(wb, `Laporan_${dateStr}.xlsx`);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-4">
      <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Wallet className="size-6 sm:size-8 text-blue-600" />
            BENGKEL SRAGEN MOTOR
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">Kelola transaksi pemasukan dan pengeluaran dengan mudah</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2">
              <span className="text-green-100 text-[10px] sm:text-xs md:text-sm font-medium">PEMASUKAN</span>
              <TrendingUp className="size-3 sm:size-4 md:size-5 text-green-100 hidden sm:block" />
            </div>
            <p className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold break-all">{formatCurrency(totalIncome)}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2">
              <span className="text-red-100 text-[10px] sm:text-xs md:text-sm font-medium">PENGELUARAN</span>
              <TrendingDown className="size-3 sm:size-4 md:size-5 text-red-100 hidden sm:block" />
            </div>
            <p className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold break-all">{formatCurrency(totalExpense)}</p>
          </div>

          <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg text-white`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 sm:mb-2">
              <span className="text-white/90 text-[10px] sm:text-xs md:text-sm font-medium">SALDO</span>
              <DollarSign className="size-3 sm:size-4 md:size-5 text-white/90 hidden sm:block" />
            </div>
            <p className="text-sm sm:text-xl md:text-2xl lg:text-3xl font-bold break-all">{formatCurrency(balance)}</p>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800">
              {editingId ? 'EDIT TRANSAKSI' : 'TAMBAH TRANSAKSI'}
            </h2>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs sm:text-sm text-slate-600 hover:text-slate-800 underline"
              >
                Batal
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Item Name Input with Auto-suggest */}
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                NAMA BARANG/JASA
              </label>
              <input
                ref={inputRef}
                type="text"
                value={itemName}
                onChange={handleItemNameChange}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="KETIK NAMA..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-slate-800 placeholder:text-slate-400"
              />
              
              {/* Auto-suggest dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-48 sm:max-h-60 overflow-y-auto">
                  {suggestions.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionClick(item)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors flex justify-between items-center group"
                    >
                      <span className="font-medium text-sm sm:text-base text-slate-800 group-hover:text-blue-600 truncate mr-2">
                        {item.name}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-500 group-hover:text-blue-500 flex-shrink-0">
                        {formatCurrency(item.lastPrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                NOMINAL (IDR)
              </label>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                JENIS TRANSAKSI
              </label>
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionType('income')}
                  className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-all ${
                    transactionType === 'income'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <TrendingUp className="size-4 sm:size-5 inline mr-1 sm:mr-2" />
                  MASUK
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('expense')}
                  className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-all ${
                    transactionType === 'expense'
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <TrendingDown className="size-4 sm:size-5 inline mr-1 sm:mr-2" />
                  KELUAR
                </button>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                CATATAN
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="TAMBAH CATATAN..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 sm:py-3.5 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Plus className="size-4 sm:size-5" />
              {editingId ? 'UPDATE' : 'TAMBAH'}
            </button>
          </form>
        </div>

        {/* Transactions List/Table */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-800">
              RIWAYAT ({transactions.length})
            </h2>
            {transactions.length > 0 && (
              <button
                onClick={handleExport}
                className="bg-green-500 text-white py-1.5 sm:py-2 px-2.5 sm:px-4 rounded-lg text-xs sm:text-sm font-medium hover:bg-green-600 transition-colors shadow-md hover:shadow-lg flex items-center gap-1 sm:gap-2"
              >
                <Download className="size-3 sm:size-4" />
                <span className="hidden sm:inline">EXPORT</span>
                <span className="sm:hidden">XLS</span>
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-slate-500">
              <Wallet className="size-12 sm:size-16 mx-auto mb-3 sm:mb-4 text-slate-300" />
              <p className="text-sm sm:text-base">Belum ada transaksi</p>
              <p className="text-xs sm:text-sm mt-1">Tambahkan transaksi pertama Anda</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border-2 border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate mb-1">
                          {transaction.name}
                        </p>
                        {transaction.note && (
                          <p className="text-xs text-slate-600 italic mb-1 truncate">
                            {transaction.note}
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {new Date(transaction.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} • {transaction.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.type === 'income' ? (
                          <>
                            <TrendingUp className="size-2.5 mr-1" />
                            MASUK
                          </>
                        ) : (
                          <>
                            <TrendingDown className="size-2.5 mr-1" />
                            KELUAR
                          </>
                        )}
                      </span>
                      <p className={`font-bold text-base ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">TANGGAL</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">WAKTU</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">NAMA BARANG/JASA</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-slate-700">CATATAN</th>
                      <th className="text-right py-3 px-4 text-sm font-bold text-slate-700">NOMINAL</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-slate-700">JENIS</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-slate-700">AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(transaction.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{transaction.time}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">
                          {transaction.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {transaction.note || '-'}
                        </td>
                        <td className={`py-3 px-4 text-sm font-bold text-right ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {transaction.type === 'income' ? (
                              <>
                                <TrendingUp className="size-3 mr-1" />
                                MASUK
                              </>
                            ) : (
                              <>
                                <TrendingDown className="size-3 mr-1" />
                                KELUAR
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}