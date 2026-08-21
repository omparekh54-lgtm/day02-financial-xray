'use client';

import { useMemo, useState } from 'react';
import { analyzeTransactions } from '../lib/finance';
import { sampleTransactions } from '../lib/sample';
import type { Transaction } from '../lib/types';
import { UploadStudio } from './UploadStudio';
import { Dashboard } from './Dashboard';

export function AppShell(){
  const [transactions,setTransactions]=useState<Transaction[]|null>(null);
  const [label,setLabel]=useState('');
  const [balance,setBalance]=useState(0);
  const analysis=useMemo(()=>transactions?analyzeTransactions(transactions,balance):null,[transactions,balance]);
  if(!analysis) return <UploadStudio onReady={(rows,name,currentBalance)=>{setTransactions(rows);setLabel(name);setBalance(currentBalance);}} onSample={()=>{setTransactions(sampleTransactions());setLabel('Sample household · 12 months');setBalance(185000);}}/>;
  return <Dashboard analysis={analysis} sourceLabel={label} currentBalance={balance} onBalance={setBalance} onTransactions={setTransactions} onReset={()=>{setTransactions(null);setLabel('');setBalance(0);}}/>;
}
