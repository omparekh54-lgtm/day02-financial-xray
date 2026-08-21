import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTransactions, detectRecurring, detectTransfers, forecastCash, normalizeMerchant, simulate } from '../lib/finance.ts';
import { normalizeRows, parseStatementDate } from '../lib/importer.ts';
import { sampleTransactions } from '../lib/sample.ts';

test('merchant normalization removes bank noise',()=>{assert.equal(normalizeMerchant('UPI ZOMATO PVT LTD 88277111 MUMBAI'),'Zomato');});
test('paired account movements become internal transfers',()=>{const rows=detectTransfers(sampleTransactions());const paired=rows.filter(r=>r.transferPairId);assert.ok(paired.length>=12);assert.equal(paired.length%2,0);});
test('recurring detector finds monthly commitments',()=>{const rec=detectRecurring(detectTransfers(sampleTransactions()));assert.ok(rec.some(r=>r.merchant==='Netflix'));assert.ok(rec.some(r=>r.merchant==='Rent'));});
test('analysis produces six month forecast and action queue',()=>{const a=analyzeTransactions(sampleTransactions(),185000);assert.equal(a.forecast.length,6);assert.ok(a.actions.length>=2);assert.ok(a.summary.monthlyIncome>0);assert.ok(a.summary.fixedCommitments>0);});
test('new EMI worsens simulated six month cash trajectory',()=>{const a=analyzeTransactions(sampleTransactions(),185000);const base=a.forecast.at(-1)!.cumulativeChange;const scenario=simulate(a,{monthlyIncomeChange:0,monthlyEmi:20000,monthlyRentChange:0,oneTimeSpend:0,monthlyInvestment:0}).at(-1)!.cumulativeChange;assert.ok(scenario<base-100000);});
test('forecast uncertainty widens over horizon',()=>{const a=analyzeTransactions(sampleTransactions());const f=forecastCash(a.transactions,a.recurring,a.sinkingFunds,6);assert.ok((f.at(-1)!.upper-f.at(-1)!.lower)>(f[0].upper-f[0].lower));});
test('Indian slash dates are interpreted as DD/MM/YYYY before browser Date parsing',()=>{assert.equal(parseStatementDate('01/02/2026'),'2026-02-01');assert.equal(parseStatementDate('31/01/2026'),'2026-01-31');});
test('normalization preserves India-first DD/MM date semantics',()=>{const parsed={fileName:'bank.csv',columns:['Date','Description','Amount'],rows:[
  {Date:'01/02/2026',Description:'Salary',Amount:'100000'},
  {Date:'02/02/2026',Description:'Rent',Amount:'-30000'},
  {Date:'03/02/2026',Description:'Netflix',Amount:'-799'},
  {Date:'04/02/2026',Description:'Electricity',Amount:'-2500'},
  {Date:'05/02/2026',Description:'Groceries',Amount:'-5000'}
]};const result=normalizeRows(parsed,{date:'Date',description:'Description',amount:'Amount',debit:'',credit:'',account:'',category:''});assert.equal(result.transactions[0].date,'2026-02-01');assert.equal(result.rejected,0);});
