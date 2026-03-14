import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  type?: 'expense' | 'income'; // 'expense' by default
}

interface ExpenseContextType {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
  clearExpenses: () => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const ExpenseProvider = ({ children }: { children: ReactNode }) => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try {
        localStorage.setItem('expenses', JSON.stringify(expenses));
    } catch (e) {
        console.error("Error saving expenses to localStorage", e);
        alert("La memoria está llena. No se purieron guardar los datos.");
    }
  }, [expenses]);

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...expenseData, id: crypto.randomUUID() };
    setExpenses([newExpense, ...expenses]);
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const clearExpenses = () => {
    setExpenses([]);
  };

  return (
    <ExpenseContext.Provider value={{ expenses, addExpense, removeExpense, clearExpenses }}>
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpenses debe usarse dentro de ExpenseProvider');
  return context;
};
