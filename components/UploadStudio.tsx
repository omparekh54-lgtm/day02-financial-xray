'use client';

import { useRef, useState } from 'react';
import { inferMapping, normalizeRows, parseFile, type ParsedFile } from '../lib/importer';
import type { ColumnMapping, Transaction } from '../lib/types';

interface ImportUnit { parsed: ParsedFile; mapping: ColumnMapping; }
const fields:Array<{key:keyof ColumnMapping;label:string;required?:boolean}>=[
  {key:'date',label:'Date',required:true},{key:'description',label:'Description / merchant',required:true},{key:'amount',label:'Signed amount'},{key:'debit',label:'Debit / withdrawal'},{key:'credit',label:'Credit / deposit'},{key:'account',label:'Account / card'},{key:'category',label:'Category'}
];
function downloadTemplate(){
  const csv='date,description,amount,account,category\n2026-08-01,Salary,100000,HDFC Savings,Income\n2026-08-02,Rent,-30000,HDFC Savings,Housing\n2026-08-05,Netflix,-799,HDFC Credit Card,Subscriptions\n';
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='financial-xray-template.csv'; a.click(); URL.revokeObjectURL(url);
}

export function UploadStudio({onReady,onSample}:{onReady:(rows:Transaction[],label:string,balance:number)=>void;onSample:()=>void}){
  const ref=useRef<HTMLInputElement>(null); const [units,setUnits]=useState<ImportUnit[]>([]); const [busy,setBusy]=useState(false); const [drag,setDrag]=useState(false); const [error,setError]=useState(''); const [balance,setBalance]=useState(0);
  async function add(files:FileList|File[]){setBusy(true);setError('');try{const parsed=await Promise.all(Array.from(files).map(parseFile));setUnits(prev=>[...prev,...parsed.map(p=>({parsed:p,mapping:inferMapping(p.columns)}))]);}catch(e){setError(e instanceof Error?e.message:'Could not read the selected file.');}finally{setBusy(false);}}
  function build(){try{const rows:Transaction[]=[];let rejected=0;for(const unit of units){const result=normalizeRows(unit.parsed,unit.mapping);rows.push(...result.transactions);rejected+=result.rejected;}if(!rows.length)throw new Error('No valid transactions were produced.');const label=`${units.length} ${units.length===1?'statement':'statements'} · ${rows.length.toLocaleString()} valid rows${rejected?` · ${rejected} rejected`:''}`;onReady(rows,label,balance);}catch(e){setError(e instanceof Error?e.message:'Unable to build the analysis.');}}
  return <main className="landing">
    <nav className="landing-nav"><div className="brand"><span className="brand-mark">FX</span><span>Financial X-Ray</span></div><span>Day 02 · 100 Days of Data Science</span></nav>
    <section className="landing-hero">
      <div><p className="eyebrow eyebrow--light">Privacy-first financial intelligence</p><h1>See where your money is going.<br/><span>Then see where it is going next.</span></h1><p className="lead">Drop bank and credit-card exports into your browser. Financial X-Ray reconciles transfers, cleans merchants, finds recurring commitments, detects unusual spending, estimates safe-to-spend capacity, forecasts six months, and lets you stress-test life decisions.</p><div className="hero-ctas"><button className="btn btn--primary" onClick={()=>ref.current?.click()} disabled={busy}>{busy?'Reading locally…':'Upload statements'}</button><button className="btn btn--ghost-light" onClick={onSample}>Try realistic sample</button><button className="btn btn--ghost-light" onClick={downloadTemplate}>Download CSV template</button></div><div className="privacy-line"><span>●</span> Files are processed locally in this browser. No account or bank linking.</div></div>
      <aside className="promise-card"><div className="promise-ring"><strong>6</strong><span>months</span></div><h2>Forward-looking by design</h2><p>Most finance tools explain the past. This one asks what your current pattern implies for the next six months—and what changes if your plans change.</p><div className="promise-tags"><span>Known data</span><span>Estimates</span><span>Simulations</span></div></aside>
    </section>
    <section className={`drop-zone ${drag?'drop-zone--active':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void add(e.dataTransfer.files)}}>
      <input ref={ref} hidden multiple type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e=>{if(e.target.files)void add(e.target.files)}}/>
      {!units.length?<><div className="drop-icon">↓</div><h2>Drop bank or card exports here</h2><p>CSV, XLSX, XLS. Multiple statements are welcome so transfers can be reconciled across accounts.</p><button className="text-btn" onClick={()=>ref.current?.click()}>Choose files</button><small>PDF is shown as an option, but this build will transparently ask for CSV/XLSX if browser-safe text extraction is unavailable.</small></>:
      <div className="import-workspace"><div className="workspace-head"><div><p className="eyebrow">Import workspace</p><h2>Review how each statement maps</h2><p>Nothing is silently guessed after this step.</p></div><button className="btn btn--ghost" onClick={()=>ref.current?.click()}>+ Add statement</button></div>
        <div className="file-stack">{units.map((unit,index)=><article className="file-card" key={`${unit.parsed.fileName}-${index}`}><div className="file-card__head"><div><strong>{unit.parsed.fileName}</strong><span>{unit.parsed.rows.length.toLocaleString()} rows · {unit.parsed.columns.length} columns</span></div><button aria-label={`Remove ${unit.parsed.fileName}`} onClick={()=>setUnits(units.filter((_,i)=>i!==index))}>×</button></div><div className="mapping-grid">{fields.map(field=><label key={field.key}><span>{field.label}{field.required&&<b>*</b>}</span><select value={unit.mapping[field.key]} onChange={e=>setUnits(units.map((u,i)=>i===index?{...u,mapping:{...u.mapping,[field.key]:e.target.value}}:u))}><option value="">Not mapped</option>{unit.parsed.columns.map(c=><option key={c}>{c}</option>)}</select></label>)}</div></article>)}</div>
        <div className="import-footer"><label><span>Current combined cash balance <em>optional</em></span><div className="money-input"><b>₹</b><input inputMode="decimal" value={balance||''} onChange={e=>setBalance(Number(e.target.value)||0)} placeholder="e.g. 185000"/></div><small>Used only to cap safe-to-spend; forecasts focus on future cash-flow change.</small></label><button className="btn btn--primary btn--large" onClick={build}>Build my Financial X-Ray →</button></div>
      </div>}
    </section>
    {error&&<div className="error-banner" role="alert">{error}</div>}
    <section className="how-grid"><article><b>01</b><h3>Reconcile</h3><p>Normalize merchants and remove internal transfers from income/spend.</p></article><article><b>02</b><h3>Diagnose</h3><p>Find recurring commitments, drift, anomalies and predictable annual costs.</p></article><article><b>03</b><h3>Forecast</h3><p>Estimate six-month cash-flow direction with an uncertainty range.</p></article><article><b>04</b><h3>Decide</h3><p>Stress-test an EMI, rent change, income shock, travel spend or monthly investment.</p></article></section>
  </main>;
}
