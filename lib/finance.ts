import type { ActionItem, Analysis, FinancialSummary, ForecastMonth, RecurringCommitment, ScenarioInputs, SinkingFund, Transaction } from './types';

const DAY = 86_400_000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const median = (values: number[]) => { const s = [...values].sort((a,b)=>a-b); if (!s.length) return 0; const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
const sd = (values: number[]) => { const m=mean(values); return Math.sqrt(mean(values.map(v=>(v-m)**2))); };
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0,10);
const addDays = (date: string, days: number) => iso(new Date(toDate(date).getTime() + days * DAY));
const monthKey = (date: string) => date.slice(0,7);

export function normalizeMerchant(description: string): string {
  const cleaned = description.toUpperCase()
    .replace(/\b(UPI|POS|NEFT|IMPS|ACH|NACH|CARD|VISA|MASTERCARD|PAYMENT|DEBIT|CREDIT|REF|TXN|TRXN)\b/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/[^A-Z& ]+/g, ' ')
    .replace(/\b(PVT|LTD|PRIVATE|LIMITED|INDIA|IND|ONLINE|BANGALORE|MUMBAI|DELHI|GURGAON|GURUGRAM)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Unknown';
  const aliases: Array<[RegExp,string]> = [
    [/ZOMATO/, 'Zomato'], [/SWIGGY/, 'Swiggy'], [/NETFLIX/, 'Netflix'], [/SPOTIFY/, 'Spotify'], [/AMAZON/, 'Amazon'], [/FLIPKART/, 'Flipkart'], [/UBER/, 'Uber'], [/OLA/, 'Ola'], [/STARBUCKS/, 'Starbucks'], [/RELIANCE.*RETAIL|RELIANCE SMART/, 'Reliance Retail'], [/SALARY|PAYROLL/, 'Salary'], [/RENT/, 'Rent']
  ];
  for (const [pattern, name] of aliases) if (pattern.test(cleaned)) return name;
  return cleaned.split(' ').slice(0,3).map(w=>w[0]+w.slice(1).toLowerCase()).join(' ');
}

export function detectTransfers(rows: Transaction[]): Transaction[] {
  const result = rows.map(r=>({...r}));
  const used = new Set<string>();
  for (let i=0;i<result.length;i++) {
    const a=result[i]; if (used.has(a.id) || a.direction==='transfer') continue;
    for (let j=i+1;j<result.length;j++) {
      const b=result[j]; if (used.has(b.id) || a.account===b.account || a.direction===b.direction) continue;
      const days=Math.abs((toDate(a.date).getTime()-toDate(b.date).getTime())/DAY);
      if (days<=2 && Math.abs(Math.abs(a.amount)-Math.abs(b.amount))<0.01 && Math.abs(a.amount)>=500) {
        const id=`transfer-${a.id}-${b.id}`;
        a.direction='transfer'; b.direction='transfer'; a.transferPairId=id; b.transferPairId=id; used.add(a.id); used.add(b.id); break;
      }
    }
  }
  return result;
}

export function detectRecurring(rows: Transaction[]): RecurringCommitment[] {
  const groups = new Map<string, Transaction[]>();
  for (const row of rows.filter(r=>r.direction!=='transfer')) {
    const key=`${row.direction}|${row.merchant}`;
    groups.set(key,[...(groups.get(key)??[]),row]);
  }
  const recurring: RecurringCommitment[]=[];
  for (const [key, group] of groups) {
    if (group.length<3) continue;
    const sorted=[...group].sort((a,b)=>a.date.localeCompare(b.date));
    const gaps=sorted.slice(1).map((r,i)=>(toDate(r.date).getTime()-toDate(sorted[i].date).getTime())/DAY);
    const cadence=median(gaps);
    const gapSpread=sd(gaps);
    const amounts=sorted.map(r=>Math.abs(r.amount));
    const med=median(amounts);
    const amountCv=med ? sd(amounts)/med : 9;
    const cadenceFit = (cadence>=25&&cadence<=35)||(cadence>=80&&cadence<=100)||(cadence>=350&&cadence<=380)||(cadence>=13&&cadence<=16);
    if (!cadenceFit || gapSpread>12 || amountCv>0.35) continue;
    const last=sorted.at(-1)!;
    const previousMedian=median(amounts.slice(0,-1));
    const driftPct=previousMedian ? (Math.abs(last.amount)-previousMedian)/previousMedian : 0;
    const confidence=clamp(1-(gapSpread/20)-(amountCv/1.2),0.35,0.99);
    recurring.push({id:`rec-${key}`,merchant:last.merchant,category:last.category,medianAmount:med,cadenceDays:Math.round(cadence),occurrences:group.length,nextExpectedDate:addDays(last.date,Math.round(cadence)),driftPct,direction:last.direction as 'income'|'expense',confidence});
  }
  return recurring.sort((a,b)=>b.medianAmount-a.medianAmount);
}

export function detectSinkingFunds(rows: Transaction[]): SinkingFund[] {
  const expenses=rows.filter(r=>r.direction==='expense');
  const groups=new Map<string,Transaction[]>();
  for (const row of expenses) groups.set(row.merchant,[...(groups.get(row.merchant)??[]),row]);
  const out:SinkingFund[]=[];
  for (const [merchant,group] of groups) {
    if (group.length<2) continue;
    const sorted=[...group].sort((a,b)=>a.date.localeCompare(b.date));
    const gaps=sorted.slice(1).map((r,i)=>(toDate(r.date).getTime()-toDate(sorted[i].date).getTime())/DAY);
    const cadence=median(gaps);
    if (cadence<150 || cadence>410) continue;
    const amount=median(group.map(r=>Math.abs(r.amount)));
    if (amount<1000) continue;
    out.push({merchant,annualizedAmount:amount*(365/cadence),monthlyReserve:(amount*(365/cadence))/12,expectedMonth:addDays(sorted.at(-1)!.date,Math.round(cadence)).slice(0,7),confidence:clamp(1-sd(gaps)/120,0.4,0.95)});
  }
  return out.sort((a,b)=>b.monthlyReserve-a.monthlyReserve);
}

function monthlyBuckets(rows: Transaction[]) {
  const map=new Map<string,{income:number;expenses:number}>();
  for (const r of rows) { if(r.direction==='transfer')continue; const b=map.get(monthKey(r.date))??{income:0,expenses:0}; if(r.direction==='income')b.income+=Math.abs(r.amount); else b.expenses+=Math.abs(r.amount); map.set(monthKey(r.date),b); }
  return Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([month,v])=>({month,...v,net:v.income-v.expenses}));
}

export function incomeReliability(rows: Transaction[]): number {
  const buckets=monthlyBuckets(rows);
  if (buckets.length<2) return 50;
  const incomes=buckets.map(b=>b.income);
  const avg=mean(incomes); if (!avg) return 10;
  const cv=sd(incomes)/avg;
  const zeroMonths=incomes.filter(x=>x<avg*0.25).length/incomes.length;
  return Math.round(clamp(100-(cv*70)-(zeroMonths*50),5,98));
}

function detectUnusual(rows: Transaction[]): Transaction[] {
  const expenses=rows.filter(r=>r.direction==='expense');
  const byCategory=new Map<string,number[]>();
  for(const r of expenses) byCategory.set(r.category,[...(byCategory.get(r.category)??[]),Math.abs(r.amount)]);
  return rows.map(r=>{
    if(r.direction!=='expense') return {...r,unusualScore:0};
    const vals=byCategory.get(r.category)??[]; const med=median(vals); const deviations=vals.map(v=>Math.abs(v-med)); const mad=median(deviations);
    const score=mad>1 ? Math.abs(0.6745*(Math.abs(r.amount)-med)/mad) : 0;
    return {...r,unusualScore:score};
  });
}

export function buildSummary(rows: Transaction[], recurring: RecurringCommitment[], sinkingFunds: SinkingFund[], currentBalance=0): FinancialSummary {
  const buckets=monthlyBuckets(rows); const months=Math.max(1,buckets.length);
  const income=buckets.reduce((s,b)=>s+b.income,0); const expenses=buckets.reduce((s,b)=>s+b.expenses,0);
  const monthlyIncome=income/months; const monthlyExpenses=expenses/months;
  const fixedCommitments=recurring.filter(r=>r.direction==='expense'&&r.cadenceDays<=40).reduce((s,r)=>s+r.medianAmount*(30/r.cadenceDays),0)+sinkingFunds.reduce((s,f)=>s+f.monthlyReserve,0);
  const variableBaseline=Math.max(0,monthlyExpenses-fixedCommitments);
  const reliability=incomeReliability(rows);
  const safetyFactor=reliability<55?1.4:reliability<75?1.2:1;
  const safeToSpend=Math.max(0,monthlyIncome-fixedCommitments-(variableBaseline*0.75*safetyFactor));
  const recommendedMonths=reliability<45?6:reliability<70?4.5:3;
  const anomalyCount=rows.filter(r=>(r.unusualScore??0)>=3.5).length;
  return {income,expenses,transfers:rows.filter(r=>r.direction==='transfer').reduce((s,r)=>s+Math.abs(r.amount),0)/2,netCashFlow:income-expenses,monthlyIncome,monthlyExpenses,fixedCommitments,safeToSpend:Math.min(safeToSpend,Math.max(0,currentBalance+monthlyIncome-fixedCommitments)),emergencyBufferMonths:recommendedMonths,incomeReliability:reliability,anomalyCount};
}

function addMonths(key:string,n:number){const [y,m]=key.split('-').map(Number); const d=new Date(Date.UTC(y,m-1+n,1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}

export function forecastCash(rows: Transaction[], recurring: RecurringCommitment[], sinkingFunds:SinkingFund[], horizon=6, scenario?:ScenarioInputs):ForecastMonth[]{
  const buckets=monthlyBuckets(rows); if(!buckets.length)return[];
  const recent=buckets.slice(-Math.min(6,buckets.length));
  const avgIncome=mean(recent.map(b=>b.income)); const avgExpense=mean(recent.map(b=>b.expenses));
  const incomeSd=sd(recent.map(b=>b.income)); const expenseSd=sd(recent.map(b=>b.expenses));
  const last=buckets.at(-1)!.month; let cumulative=0;
  return Array.from({length:horizon},(_,i)=>{
    const month=addMonths(last,i+1);
    const seasonalAnnual=sinkingFunds.filter(f=>f.expectedMonth===month).reduce((s,f)=>s+f.annualizedAmount,0);
    const recurringExpense=recurring.filter(r=>r.direction==='expense'&&r.cadenceDays<=40).reduce((s,r)=>s+r.medianAmount*(30/r.cadenceDays),0);
    const baseVariable=Math.max(0,avgExpense-recurringExpense);
    const income=Math.max(0,avgIncome+(scenario?.monthlyIncomeChange??0));
    const expenses=Math.max(0,baseVariable+recurringExpense+seasonalAnnual+(scenario?.monthlyEmi??0)+(scenario?.monthlyRentChange??0)+(scenario?.monthlyInvestment??0)+(i===0?(scenario?.oneTimeSpend??0):0));
    const change=income-expenses; cumulative+=change; const uncertainty=1.28*Math.sqrt(incomeSd**2+expenseSd**2)*Math.sqrt(i+1);
    return {month,income,expenses,balanceChange:change,cumulativeChange:cumulative,lower:cumulative-uncertainty,upper:cumulative+uncertainty};
  });
}

export function buildActions(rows:Transaction[], recurring:RecurringCommitment[], sinkingFunds:SinkingFund[], summary:FinancialSummary):ActionItem[]{
  const actions:ActionItem[]=[];
  const drift=recurring.filter(r=>r.direction==='expense'&&r.driftPct>0.08).sort((a,b)=>b.driftPct-a.driftPct).slice(0,3);
  for(const r of drift) actions.push({priority:r.driftPct>0.2?'high':'medium',title:`Review ${r.merchant} increase`,detail:`Latest payment is approximately ${(r.driftPct*100).toFixed(0)}% above its earlier recurring baseline.`,amount:r.medianAmount,evidence:'estimate'});
  const unusual=rows.filter(r=>(r.unusualScore??0)>=3.5).sort((a,b)=>(b.unusualScore??0)-(a.unusualScore??0)).slice(0,3);
  for(const r of unusual) actions.push({priority:'high',title:`Check unusual ${r.merchant} transaction`,detail:`${r.category} spend on ${r.date} is far from this dataset's category baseline. This is an anomaly flag, not evidence of fraud.`,amount:Math.abs(r.amount),evidence:'heuristic'});
  if(sinkingFunds.length) actions.push({priority:'medium',title:'Pre-fund predictable annual expenses',detail:`Reserve about ${formatMoney(sinkingFunds.reduce((s,f)=>s+f.monthlyReserve,0))} each month for detected non-monthly commitments.`,amount:sinkingFunds.reduce((s,f)=>s+f.monthlyReserve,0),evidence:'estimate'});
  if(summary.safeToSpend<summary.monthlyIncome*0.1) actions.push({priority:'high',title:'Protect monthly liquidity',detail:'Fixed commitments and normal spending leave a narrow discretionary buffer. Avoid adding recurring obligations until the buffer improves.',evidence:'estimate'});
  else actions.push({priority:'info',title:'Discretionary capacity identified',detail:`After expected commitments and a conservative variable-spend buffer, about ${formatMoney(summary.safeToSpend)} per month appears discretionary under current patterns.`,amount:summary.safeToSpend,evidence:'estimate'});
  actions.push({priority:'info',title:`Target an emergency buffer of ~${summary.emergencyBufferMonths.toFixed(1)} months`,detail:`The target is adjusted using observed income variability; higher volatility raises the suggested buffer.`,evidence:'heuristic'});
  return actions.slice(0,7);
}

export function analyzeTransactions(input:Transaction[], currentBalance=0):Analysis{
  const transfers=detectTransfers(input); const unusual=detectUnusual(transfers); const recurring=detectRecurring(unusual); const sinkingFunds=detectSinkingFunds(unusual); const summary=buildSummary(unusual,recurring,sinkingFunds,currentBalance); const forecast=forecastCash(unusual,recurring,sinkingFunds,6); const actions=buildActions(unusual,recurring,sinkingFunds,summary); return {transactions:unusual,recurring,sinkingFunds,summary,forecast,actions};
}

export function simulate(analysis:Analysis, inputs:ScenarioInputs){return forecastCash(analysis.transactions,analysis.recurring,analysis.sinkingFunds,6,inputs);}
export function formatMoney(value:number,currency='INR'){return new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:0}).format(value);}
export function formatPct(value:number){return `${(value*100).toFixed(0)}%`;}
