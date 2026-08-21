import * as XLSX from 'xlsx';
import type { ColumnMapping, RawRow, Transaction } from './types';
import { normalizeMerchant } from './finance.ts';

export interface ParsedFile { fileName:string; rows:RawRow[]; columns:string[]; }

const aliases:Record<keyof ColumnMapping,string[]>={
  date:['date','transaction date','txn date','value date','posted date','order date'],
  description:['description','narration','details','particulars','merchant','transaction details'],
  amount:['amount','transaction amount','value','amt'],
  debit:['debit','withdrawal','debit amount','dr'],
  credit:['credit','deposit','credit amount','cr'],
  account:['account','account name','account number','card','wallet'],
  category:['category','type','expense category','transaction category']
};

export function inferMapping(columns:string[]):ColumnMapping{
  const lower=columns.map(c=>[c,c.toLowerCase().trim()] as const);
  const pick=(key:keyof ColumnMapping)=> lower.find(([,l])=>aliases[key].some(a=>l===a||l.includes(a)))?.[0]??'';
  return {date:pick('date'),description:pick('description'),amount:pick('amount'),debit:pick('debit'),credit:pick('credit'),account:pick('account'),category:pick('category')};
}

export async function parseFile(file:File):Promise<ParsedFile>{
  const ext=file.name.toLowerCase().split('.').pop();
  if(ext==='pdf') throw new Error('PDF statement parsing is not enabled in this browser build yet. Please export CSV/XLSX from your bank; your file still stays local.');
  if(!['csv','xlsx','xls'].includes(ext??'')) throw new Error('Use CSV, XLSX, or XLS.');
  const buffer=await file.arrayBuffer();
  const workbook=XLSX.read(buffer,{type:'array',cellDates:true}); const sheet=workbook.Sheets[workbook.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json<RawRow>(sheet,{defval:''});
  if(!rows.length) throw new Error('No transaction rows were found in the first sheet.');
  const columns=Object.keys(rows[0]);
  return {fileName:file.name,rows,columns};
}

function parseNumber(value:unknown):number{
  if(typeof value==='number')return value;
  const n=Number(String(value??'').replace(/[₹,$£€\s,]/g,'').replace(/\((.*)\)/,'-$1'));
  return Number.isFinite(n)?n:0;
}

export function parseStatementDate(value:unknown):string{
  if(value instanceof Date&&!Number.isNaN(value.valueOf()))return value.toISOString().slice(0,10);
  if(typeof value==='number') { const d=XLSX.SSF.parse_date_code(value); if(d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`; }
  const text=String(value??'').trim();
  if(!text)return '';
  const isoMatch=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  if(isoMatch){const y=Number(isoMatch[1]),m=Number(isoMatch[2]),d=Number(isoMatch[3]);if(m>=1&&m<=12&&d>=1&&d<=31)return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  // Financial X-Ray is INR/India-first, so slash/dash dates are interpreted as DD/MM/YYYY.
  // Parse this before Date(...) because browsers commonly interpret 01/02/2026 as Jan 2 (MM/DD).
  const dmy=text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if(dmy){let y=Number(dmy[3]);const m=Number(dmy[2]),d=Number(dmy[1]);if(y<100)y+=2000;if(m>=1&&m<=12&&d>=1&&d<=31)return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return '';}
  const direct=new Date(text); if(!Number.isNaN(direct.valueOf()))return direct.toISOString().slice(0,10);
  return '';
}

function categoryFor(description:string,provided:string){if(provided.trim())return provided.trim(); const d=description.toLowerCase(); if(/self transfer|transfer to|transfer from|fund transfer|credit card payment|payment received from|own account/.test(d))return 'Transfer'; if(/salary|payroll|interest credit|refund/.test(d))return 'Income'; if(/rent/.test(d))return 'Housing'; if(/zomato|swiggy|restaurant|cafe|starbucks/.test(d))return 'Dining'; if(/uber|ola|fuel|petrol|metro/.test(d))return 'Transport'; if(/netflix|spotify|prime|subscription/.test(d))return 'Subscriptions'; if(/amazon|flipkart|mall|store/.test(d))return 'Shopping'; if(/insurance|lic/.test(d))return 'Insurance'; if(/electric|mobile|broadband|internet|water|gas/.test(d))return 'Utilities'; return 'Other';}

export function normalizeRows(parsed:ParsedFile,m:ColumnMapping):{transactions:Transaction[];rejected:number;warnings:string[]}{
  if(!m.date||!m.description||(!m.amount&&!(m.debit||m.credit))) throw new Error('Map Date, Description, and either Amount or Debit/Credit.');
  const out:Transaction[]=[]; let rejected=0;
  parsed.rows.forEach((row,index)=>{
    const date=parseStatementDate(row[m.date]); const description=String(row[m.description]??'').trim();
    let signed=0;
    if(m.amount) signed=parseNumber(row[m.amount]);
    else { const debit=m.debit?parseNumber(row[m.debit]):0; const credit=m.credit?parseNumber(row[m.credit]):0; signed=credit-Math.abs(debit); }
    if(!date||!description||!signed){rejected++;return;}
    const direction=signed>0?'income':'expense'; const account=m.account?String(row[m.account]??parsed.fileName):parsed.fileName;
    out.push({id:`${parsed.fileName}-${index}`,date,description,merchant:normalizeMerchant(description),amount:signed,direction,account:account||parsed.fileName,category:categoryFor(description,m.category?String(row[m.category]??''):''),source:parsed.fileName});
  });
  if(out.length<5) throw new Error('Fewer than 5 usable transactions remained after validation. Check the mapping or source file.');
  const warnings=[] as string[]; if(rejected)warnings.push(`${rejected.toLocaleString()} rows were rejected because date, description, or non-zero amount could not be validated.`);
  return {transactions:out.sort((a,b)=>a.date.localeCompare(b.date)),rejected,warnings};
}
