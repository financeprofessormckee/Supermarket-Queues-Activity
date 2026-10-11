'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e));
const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, d = w.document, timers = new Map(); let timerId = 0, checks = 0;
w.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
w.clearTimeout = id => timers.delete(id);
w.URL.createObjectURL = () => 'blob:test'; w.URL.revokeObjectURL = () => {};
const downloads = [];
w.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
for (const script of d.querySelectorAll('script[src]')) w.eval(fs.readFileSync(path.join(root, script.getAttribute('src')), 'utf8'));
const $ = id => d.getElementById(id);
function eq(a,b,msg) { assert.deepEqual(a,b,msg); checks++; }
function ok(v,msg) { assert.ok(v,msg); checks++; }
function click(el) { if (typeof el === 'string') el=$(el); assert.ok(el && !el.disabled); el.focus(); el.click(); }
function edit(id,value) { $(id).value=value; $(id).dispatchEvent(new w.Event('input', {bubbles:true})); }
function flush(limit=10000) { let count=0; while (timers.size && count++<limit) { const [id,callback]=timers.entries().next().value; timers.delete(id); callback(); } if (timers.size) throw new Error('Timer bound exceeded'); }
function oneBatch() { const [id,callback]=timers.entries().next().value; timers.delete(id); callback(); }
function complete() { click('finish'); eq(d.activeElement.id,'play','Finish places focus on cancellable Pause'); flush(); eq(d.activeElement.id,'run-status','Completed comparison preserves keyboard position'); }
const lab=!!$('repeat-start');
eq($('run-status').textContent, 'Ready, before tick 0. ');
eq(d.querySelector('[data-preset="cheap"]').getAttribute('aria-pressed'),'true');
$('history-details').open=true; $('history-details').dispatchEvent(new w.Event('toggle'));
for(let i=0;i<8;i++) click('step');
const histories=Array.from(d.querySelectorAll('#history-table tbody tr')).map(tr=>tr.textContent);
eq(histories.length,4,'Both stores have recorded tick 0 and current tick 7');
ok(histories.some(t=>t.startsWith('Baseline / 7')));
ok(histories.some(t=>t.startsWith('Experiment / 7')));
complete();
ok($('comparison-summary').textContent.includes('baseline 40.64, experiment 40.26'));
const oldSummary=$('comparison-summary').textContent;
edit('seed',''); click(d.querySelector('#settings button[type="submit"]'));
eq($('seed').getAttribute('aria-invalid'),'true'); eq(d.activeElement.id,'seed');
eq($('comparison-summary').textContent,oldSummary,'Invalid Apply preserves current evidence');
eq($('step').disabled,true); click('restart'); eq($('seed').value,'20261002');
for (const id of ['balance','cheap','costly','express']) {
  click(d.querySelector('[data-prompt="'+id+'"]')); complete();
  click(d.querySelector('input[name="answer"][value="'+w.SupermarketModel.PROMPTS[id].answer+'"]'));
  click('check'); eq($('prompt-feedback').dataset.correct,'true',id+' prompt passes');
}
edit('cost','2'); click(d.querySelector('#settings button[type="submit"]'));
eq($('answer-fieldset').hidden,true,'Applying incompatible settings clears the guided question');
click('defaults'); edit('arrival','0'); click(d.querySelector('#settings button[type="submit"]')); complete();
ok($('comparison-summary').textContent.includes('No shoppers arrived'));
click('defaults'); click('play'); oneBatch(); click('play'); eq(timers.size,0,'Pause cancels playback');
click('play'); edit('cost','2'); eq(timers.size,0,'Editing cancels playback'); eq($('finish').disabled,true);
click('restart'); click('play'); Object.defineProperty(d,'hidden',{configurable:true,value:true}); d.dispatchEvent(new w.Event('visibilitychange'));
eq(timers.size,0,'Hiding pauses playback'); Object.defineProperty(d,'hidden',{configurable:true,value:false});
if(lab) {
  click('defaults'); eq($('export-comparison').disabled,true); complete();
  eq($('outcome-metrics').children.length,4); eq(d.querySelectorAll('#paired-table tbody tr').length,5);
  ok($('outcome-status').textContent.includes('101 matched shoppers'));
  click('export-comparison'); eq(downloads.at(-1),'supermarket-paired-20261002.csv'); flush();
  edit('inspect-shopper','1'); ok($('decisions').textContent.includes('shopper #1')); ok($('decisions').textContent.includes('Total exit:'));
  edit('inspect-shopper','999'); eq($('inspect-shopper').getAttribute('aria-invalid'),'true');
  click('latest-shopper'); eq($('inspect-shopper').hasAttribute('aria-invalid'),false);
  const mainStatus=$('run-status').textContent;
  click('repeat-start'); eq(d.activeElement.id,'repeat-stop'); eq($('export-trials').disabled,true);
  flush(); eq(d.activeElement.id,'repeat-status');
  eq(d.querySelectorAll('#repeat-table tbody tr').length,12); eq($('run-status').textContent,mainStatus,'Seed trials preserve main comparison');
  ok($('repeat-status').textContent.includes('12 of 12')); eq($('export-trials').disabled,false);
  click('export-trials'); eq(downloads.at(-1),'supermarket-seeds-20261002.csv'); flush();
  click('repeat-start');
  while (d.querySelectorAll('#repeat-table tbody tr').length < 1) oneBatch();
  oneBatch(); click('repeat-stop'); eq(timers.size,0); ok($('repeat-status').textContent.includes('Partial'));
  eq(d.querySelectorAll('#repeat-table tbody tr').length,1,'Cancelled unfinished trial is excluded');
  eq($('export-trials').disabled,false,'Complete partial trials remain exportable');
  click('repeat-start'); oneBatch(); edit('seed','2'); eq(timers.size,0); eq(d.querySelectorAll('#repeat-table tbody tr').length,0); eq($('repeat-start').disabled,true);
  click('defaults'); click('repeat-start'); oneBatch(); Object.defineProperty(d,'hidden',{configurable:true,value:true}); d.dispatchEvent(new w.Event('visibilitychange')); eq(timers.size,0); ok($('repeat-status').textContent.includes('page was hidden')); Object.defineProperty(d,'hidden',{configurable:true,value:false});
  click('defaults'); edit('arrival','0'); click(d.querySelector('#settings button[type="submit"]')); complete();
  eq($('export-comparison').disabled,true); eq($('outcome-metrics').children.length,0);
  click('repeat-start'); flush(); eq(d.querySelectorAll('#repeat-table tbody tr').length,12); ok($('repeat-results').textContent.includes('No shoppers'));
  click('defaults'); edit('arrival','30'); edit('horizon','1200'); edit('share','100'); edit('cost','8'); $('express').checked=true; $('express').dispatchEvent(new w.Event('change')); edit('cutoff','1'); click(d.querySelector('#settings button[type="submit"]')); complete();
  ok($('outcome-status').textContent.includes('Final'));
}
const ids=Array.from(d.querySelectorAll('[id]')).map(n=>n.id); eq(ids.length,new Set(ids).size,'No duplicate IDs');
for (const node of d.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
  for(const attr of ['aria-labelledby','aria-describedby']) for(const id of (node.getAttribute(attr)||'').split(' ').filter(Boolean)) ok($(id),'Missing ARIA target '+id);
}
eq(errors.length,0,errors.map(e=>e.message).join('\n'));
console.log(JSON.stringify({branch:lab?'lab':'conservative',checks,errors:errors.length,html_controls:'pass',layout:'not evaluated by jsdom'}));
w.close();
