import type { Transaction } from './types';
import { normalizeMerchant } from './finance.ts';

function tx(i:number,date:string,description:string,amount:number,account='HDFC Savings',category=''){return {id:`sample-${i}`,date,description,merchant:normalizeMerchant(description),amount,direction:amount>0?'income':'expense' as const,account,category:category||'Other',source:'Sample household'} as Transaction;}
export function sampleTransactions():Transaction[]{
  const rows:Transaction[]=[]; let i=0;
  const start=new Date(Date.UTC(2025,8,1));
  for(let m=0;m<12;m++){
    const d=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+m,1)); const y=d.getUTCFullYear(); const mo=String(d.getUTCMonth()+1).padStart(2,'0');
    const date=(day:number)=>`${y}-${mo}-${String(day).padStart(2,'0')}`;
    rows.push(tx(i++,date(1),'PAYROLL ACME PRIVATE LIMITED',m===5?92000:115000,'HDFC Savings','Income'));
    rows.push(tx(i++,date(2),'UPI RENT PAYMENT 884422',-32000,'HDFC Savings','Housing'));
    rows.push(tx(i++,date(3),'NACH HDFC HOME LOAN EMI',-18500,'HDFC Savings','Debt'));
    rows.push(tx(i++,date(5),'NETFLIX.COM INDIA',-(m<8?649:799),'HDFC Credit Card','Subscriptions'));
    rows.push(tx(i++,date(6),'SPOTIFY INDIA 239928',-119,'HDFC Credit Card','Subscriptions'));
    rows.push(tx(i++,date(8),'JIO FIBER INTERNET',-999,'HDFC Credit Card','Utilities'));
    rows.push(tx(i++,date(10),'SWIGGY ORDER 8734',-(420+(m%3)*130),'HDFC Credit Card','Dining'));
    rows.push(tx(i++,date(12),'ZOMATO PVT LTD 88277',-(620+(m%4)*110),'HDFC Credit Card','Dining'));
    rows.push(tx(i++,date(14),'RELIANCE SMART RETAIL',-(5400+(m%2)*700),'HDFC Credit Card','Groceries'));
    rows.push(tx(i++,date(17),'UBER INDIA TRIP 77342',-(850+(m%3)*250),'HDFC Credit Card','Transport'));
    rows.push(tx(i++,date(20),'AMAZON SELLER SERVICES',-(m===9?18500:2800+(m%4)*800),'HDFC Credit Card','Shopping'));
    rows.push(tx(i++,date(23),'ELECTRICITY BILL MSEDCL',-(2300+(m%3)*350),'HDFC Savings','Utilities'));
    rows.push(tx(i++,date(26),'SIP MUTUAL FUND INVESTMENT',-15000,'HDFC Savings','Investment'));
    if(m===3||m===9) rows.push(tx(i++,date(18),'CAR INSURANCE ICICI LOMBARD',-24800,'HDFC Savings','Insurance'));
    rows.push(tx(i++,date(28),'CREDIT CARD PAYMENT HDFC',-Math.abs(rows.filter(r=>r.date.startsWith(`${y}-${mo}`)&&r.account==='HDFC Credit Card'&&r.direction==='expense').reduce((s,r)=>s+r.amount,0)),'HDFC Savings','Transfer'));
    rows.push(tx(i++,date(28),'PAYMENT RECEIVED FROM HDFC SAVINGS',Math.abs(rows.at(-1)!.amount),'HDFC Credit Card','Transfer'));
  }
  return rows.sort((a,b)=>a.date.localeCompare(b.date));
}
