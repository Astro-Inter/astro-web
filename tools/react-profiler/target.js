import React, { useEffect, useState } from 'STABLE_REACT';
import { createRoot } from 'STABLE_DOM';
import Chart from 'ASTRO_CHART';
const rows = [];
for (let day = 0; day < 200; day++) {
 const data = new Date(Date.UTC(2026,0,day+1)).toISOString().slice(0,10);
 for (let serie = 0; serie < 20; serie++) rows.push({ data, cargo: 'Cargo ' + String(serie).padStart(2,'0'), quantidade: 20 + (day * serie + serie) % 120 });
}
const chart = { title: 'Colaboradores por período', kind: 'line', dimensions: ['data','cargo'], measure: 'quantidade', dateSensitive: true, rows };
function Benchmark() {
 const [running, setRunning] = useState(false), [done, setDone] = useState(0);
 useEffect(() => {
  const timer = setTimeout(() => [...document.querySelectorAll('.analytics-series-controls button')].slice(2).forEach(button=>button.click()), 200);
  return () => clearTimeout(timer);
 }, []);
 async function run() {
  if (running) return;
  setRunning(true);setDone(0);
  const svg = document.querySelector('svg.analytics-plot');svg.focus();
  for (let index=0;index<50;index++) {
   svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
   await new Promise(resolve=>setTimeout(resolve,25));
  }
  setDone(50);setRunning(false);
 }
 return React.createElement('main',{className:'analytics-page'},
  React.createElement('h2',null,'Componente real do Astro'),
  React.createElement('p',null,'4.000 registros · 200 períodos · 20 séries; duas visíveis'),
  React.createElement('button',{onClick:run,disabled:running,className:'bench-action'},running?'Executando consultas…':'Executar 50 consultas'),
  React.createElement('p',{role:'status'},done?done+' consultas concluídas':'Inicie a gravação no Profiler antes de executar.'),
  React.createElement('section',{style:{height:350,width:'100%'}},React.createElement(Chart,{chart,kind:'line'})));
}
createRoot(document.getElementById('root')).render(React.createElement(Benchmark));
