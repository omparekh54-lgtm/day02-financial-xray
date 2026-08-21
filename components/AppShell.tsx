'use client';

import { useMemo, useState } from 'react';
import { analyzeTransactions } from '../lib/finance';
import { sampleTransactions } from '../lib/sample';
import type { Transaction } from '../lib/types';
import { UploadStudio } from './UploadStudio';
import { Dashboard } from './Dashboard';

function readCategoryRules(): Record<string,string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(window.localStorage.getItem('financial-xray-category-rules') ?? '{}') as Record<string,string>; }
  catch { return {}; }
}
function applySavedCategoryRules(rows: Transaction[]): Transaction[] {
  const rules = readCategoryRules();
  return rows.map((row) => rules[row.merchant] ? { ...row, category: rules[row.merchant] } : row);
}

export function AppShell(){
  const [transactions,setTransactions]=useState<Transaction[]|null>(null);
  const [label,setLabel]=useState('');
  const [balance,setBalance]=useState(0);
  const analysis=useMemo(()=>transactions?analyzeTransactions(transactions,balance):null,[transactions,balance]);
  const load = (rows: Transaction[], name: string, currentBalance: number) => { setTransactions(applySavedCategoryRules(rows)); setLabel(name); setBalance(currentBalance); };
  const persistAndSet = (rows: Transaction[]) => {
    if (typeof window !== 'undefined' && transactions) {
      const previous = new Map(transactions.map((row) => [row.merchant,row.category]));
      const rules = readCategoryRules();
      for (const row of rows) if (previous.get(row.merchant) !== row.category) rules[row.merchant] = row.category;
      window.localStorage.setItem('financial-xray-category-rules', JSON.stringify(rules));
    }
    setTransactions(rows);
  };
  if(!analysis) return <UploadStudio onReady={load} onSample={()=>load(sampleTransactions(),'Sample household · 12 months',185000)}/>;
  return <Dashboard analysis={analysis} sourceLabel={label} currentBalance={balance} onBalance={setBalance} onTransactions={persistAndSet} onReset={()=>{setTransactions(null);setLabel('');setBalance(0);}}/>;
}
