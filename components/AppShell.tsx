'use client';

import { useMemo, useState } from 'react';
import { analyzeTransactions } from '../lib/finance';
import { sampleTransactions } from '../lib/sample';
import type { Transaction } from '../lib/types';
import { UploadStudio } from './UploadStudio';
import { Dashboard } from './Dashboard';

function applySavedCategoryRules(rows: Transaction[]): Transaction[] {
  if (typeof window === 'undefined') return rows;
  try {
    const rules = JSON.parse(window.localStorage.getItem('financial-xray-category-rules') ?? '{}') as Record<string,string>;
    return rows.map((row) => rules[row.merchant] ? { ...row, category: rules[row.merchant] } : row);
  } catch {
    return rows;
  }
}

export function AppShell(){
  const [transactions,setTransactions]=useState<Transaction[]|null>(null);
  const [label,setLabel]=useState('');
  const [balance,setBalance]=useState(0);
  const analysis=useMemo(()=>transactions?analyzeTransactions(transactions,balance):null,[transactions,balance]);
  const load = (rows: Transaction[], name: string, currentBalance: number) => { setTransactions(applySavedCategoryRules(rows)); setLabel(name); setBalance(currentBalance); };
  if(!analysis) return <UploadStudio onReady={load} onSample={()=>load(sampleTransactions(),'Sample household · 12 months',185000)}/>;
  return <Dashboard analysis={analysis} sourceLabel={label} currentBalance={balance} onBalance={setBalance} onTransactions={setTransactions} onReset={()=>{setTransactions(null);setLabel('');setBalance(0);}}/>;
}
