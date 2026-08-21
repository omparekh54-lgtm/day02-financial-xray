import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeTransactions, detectRecurring, detectTransfers, forecastCash, normalizeMerchant, simulate } from '../lib/finance.ts';
import { sampleTransactions } from '../lib/sample.ts';

test('merchant normalization removes bank noise',()=>{assert.equal(normalizeMerchant('UPI ZOMATO PVT LTD 88277111 MUMBAI'),'Zomato');});
test('paired account movements become internal transfers',()=>{const rows=detectTransfers(sampleTransactions());const paired=rows.filter(r=>r.transferPairId);assert.ok(paired.length>=12);assert.equal(paired.length%2,0);});
test('recurring detector finds monthly commitments',()=>{const rec=detectRecurring(detectTransfers(sampleTransactions()));assert.ok(rec.some(r=>r.merchant==='Netflix'));assert.ok(rec.some(r=>r.merchant==='Rent'));});
test('analysis produces six month forecast and action queue',()=>{const a=analyzeTransactions(sampleTransactions(),185000);assert.equal(a.forecast.length,6);assert.ok(a.actions.length>=2);assert.ok(a.summary.monthlyIncome>0);assert.ok(a.summary.fixedCommitments>0);});
test('new EMI worsens simulated six month cash trajectory',()=>{const a=analyzeTransactions(sampleTransactions(),185000);const base=a.forecast.at(-1)!.cumulativeChange;const scenario=simulate(a,{monthlyIncomeChange:0,monthlyEmi:20000,monthlyRentChange:0,oneTimeSpend:0,monthlyInvestment:0}).at(-1)!.cumulativeChange;assert.ok(scenario<base-100000);});
test('forecast uncertainty widens over horizon',()=>{const a=analyzeTransactions(sampleTransactions());const f=forecastCash(a.transactions,a.recurring,a.sinkingFunds,6);assert.ok((f.at(-1)!.upper-f.at(-1)!.lower)>(f[0].upper-f[0].lower));});
