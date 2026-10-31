import React from 'react';
import { createRoot } from 'react-dom/client';
import { initialize as backend, activate } from 'react-devtools-inline/backend';
import { initialize as frontend } from 'react-devtools-inline/frontend';

const mode = new URLSearchParams(location.search).get('mode') === 'baseline' ? 'baseline' : 'memo';
document.getElementById('mode').value = mode;
document.getElementById('mode').onchange = event => location.assign('/?mode=' + event.target.value);
const frame = document.getElementById('target');
function mount() {
  const target = frame.contentWindow;
  backend(target);
  const DevTools = frontend(target);
  createRoot(document.getElementById('devtools')).render(React.createElement(DevTools, { defaultTab: 'profiler', showTabBar: true }));
  activate(target);
  const style = target.document.createElement('link');
  style.rel = 'stylesheet'; style.href = '/style.css'; target.document.head.append(style);
  const root = target.document.createElement('div'); root.id = 'root'; target.document.body.append(root);
  const script = target.document.createElement('script'); script.src = mode === 'baseline' ? '/baseline.js' : '/memo.js';
  target.document.body.append(script);
}
frame.addEventListener('load', mount, { once: true });
frame.src = 'about:blank';
