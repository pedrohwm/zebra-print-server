let mode = 'text';
let hAlign = 'C';
let vAlign = 'center';

const fontMeta = {
  '0': { desc: 'Default proportional — general purpose', css: 'Arial, sans-serif', mono: false },
  'A': { desc: 'Small proportional — compact labels', css: 'Arial Narrow, sans-serif', mono: false },
  'B': { desc: 'Small monospaced — compact fixed-width', css: 'Courier New, monospace', mono: true },
  'C': { desc: 'Bold proportional — emphasis', css: 'Arial Black, sans-serif', mono: false },
  'D': { desc: 'Monospaced — fixed-width, clean', css: 'Courier New, monospace', mono: true },
  'E': { desc: 'OCR-B — machine readable', css: 'Courier New, monospace', mono: true },
  'F': { desc: 'Large monospaced — big fixed-width', css: 'Courier New, monospace', mono: true },
  'G': { desc: 'Bold monospaced — fixed-width bold', css: '"Courier New", monospace', mono: true },
  'H': { desc: 'OCR-A — optical character recognition', css: 'Courier New, monospace', mono: true }
};

// Restaurar IP salvo previamente no localStorage
const savedUrl = localStorage.getItem('zebra_server_url');
if (savedUrl) {
  document.getElementById('serverUrl').value = savedUrl;
}

document.getElementById('serverUrl').addEventListener('input', (e) => {
  localStorage.setItem('zebra_server_url', e.target.value.trim());
  update();
});

// TROCAR ABA
function switchTab(t) {
  mode = t;
  ['text', 'multi', 'seq'].forEach((tab, i) => {
    document.getElementById('tab-' + tab).classList.toggle('active', tab === t);
    document.querySelectorAll('.tab')[i].classList.toggle('active', tab === t);
  });
  update();
}

// ALINHAMENTO HORIZONTAL
function setAlign(a, el) {
  hAlign = a;
  el.closest('.align-btns').querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  update();
}

// ALINHAMENTO VERTICAL
function setVAlign(a, el) {
  vAlign = a;
  el.closest('.align-btns').querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  update();
}

function mmToDots(mm) {
  return Math.round(mm * 8);
}

function getFont() {
  return document.getElementById('fontType').value;
}

// GERAR UMA ETIQUETA
function makeLabel(text) {
  const w = mmToDots(+document.getElementById('width').value);
  const h = mmToDots(+document.getElementById('height').value);
  const fs = +document.getElementById('fontSize').value;
  const fw = Math.round(fs * 0.7);
  const font = getFont();

  const lines = text.split('\n').filter(l => l.trim() !== '');
  const totalH = lines.length * fs + (lines.length - 1) * 6;

  let y = vAlign === 'center'
    ? Math.round((h - totalH) / 2)
    : vAlign === 'top'
      ? 10
      : h - totalH - 10;

  y = Math.max(0, y);

  const fields = lines
    .map((line, i) => `^FO0,${y + i * (fs + 6)}^FB${w},1,0,${hAlign},0^A${font}N,${fs},${fw}^FD${line}^FS`)
    .join('');

  return `^XA^PW${w}^LL${h}^LH0,0${fields}^XZ`;
}

// GERAR ZPL
function generateZpl() {
  if (mode === 'text') {
    const text = document.getElementById('labelText').value || ' ';
    const copies = Math.max(1, parseInt(document.getElementById('textCopies').value) || 1);
    let zpl = '';
    for (let i = 0; i < copies; i++) {
      zpl += makeLabel(text);
    }
    return zpl;
  }

  if (mode === 'multi') {
    return document.getElementById('multiText').value
      .split('\n')
      .filter(l => l.trim())
      .map(l => makeLabel(l))
      .join('');
  }

  if (mode === 'seq') {
    const prefix = document.getElementById('seqPrefix').value;
    const start = +document.getElementById('seqStart').value;
    const end = +document.getElementById('seqEnd').value;
    const copies = Math.max(1, +document.getElementById('seqCopies').value);

    let zpl = '';
    for (let i = start; i <= end; i++) {
      for (let c = 0; c < copies; c++) {
        zpl += makeLabel(prefix + i);
      }
    }
    return zpl;
  }
}

// ENDPOINT DO SERVIDOR
function getPrintEndpoint() {
  let url = document.getElementById('serverUrl').value.trim();
  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://' + url;
  }

  url = url.replace(/\/+$/, '');
  return url.endsWith('/print') ? url : url + '/print';
}

// COMANDO CURL
function buildCurlCmd() {
  const endpoint = getPrintEndpoint() || 'http://192.168.0.199:5000/print';
  return `curl -X POST ${endpoint} --data-binary "@teste.zpl"`;
}

// COMANDO LP
function buildLpCmd(zpl) {
  return `echo -e '${zpl.replace(/'/g, "'\\''")}' | lp -d ZD410 -o raw`;
}

// ATUALIZAR INTERFACE
function update() {
  const font = getFont();
  const meta = fontMeta[font];
  document.getElementById('fontDesc').textContent = meta.desc;

  const h = mmToDots(+document.getElementById('height').value);
  const fs = +document.getElementById('fontSize').value;
  const scaledFs = Math.max(8, Math.round(fs * (120 / h) * 0.7));

  const textAlign = hAlign === 'C' ? 'center' : hAlign === 'L' ? 'left' : 'right';
  const flexAlign = vAlign === 'center' ? 'center' : vAlign === 'top' ? 'flex-start' : 'flex-end';
  const flexJustify = hAlign === 'C' ? 'center' : hAlign === 'L' ? 'flex-start' : 'flex-end';

  let previewText = '';
  let labelCount = 1;

  if (mode === 'text') {
    previewText = document.getElementById('labelText').value;
    const copies = Math.max(1, parseInt(document.getElementById('textCopies').value) || 1);
    labelCount = copies;
  } else if (mode === 'multi') {
    const lines = document.getElementById('multiText').value.split('\n').filter(l => l.trim());
    previewText = lines[0] || '';
    labelCount = lines.length;
  } else if (mode === 'seq') {
    const prefix = document.getElementById('seqPrefix').value;
    const start = +document.getElementById('seqStart').value;
    const end = +document.getElementById('seqEnd').value;
    const copies = Math.max(1, +document.getElementById('seqCopies').value);

    previewText = prefix + start;
    labelCount = (end - start + 1) * copies;
    document.getElementById('seqCount').textContent = labelCount + ' label' + (labelCount !== 1 ? 's' : '');
  }

  const preview = document.getElementById('preview');
  preview.style.alignItems = flexAlign;
  preview.style.justifyContent = flexJustify;

  preview.innerHTML = `
    <div style="
      text-align:${textAlign};
      font-size:${scaledFs}px;
      font-family:${meta.css};
      font-weight:${font === 'C' || font === 'G' ? 'bold' : 'normal'};
      padding:8px;
      width:100%
    ">
      ${previewText.replace(/\n/g, '<br>')}
    </div>
  `;

  document.getElementById('previewBadge').textContent = labelCount + ' label' + (labelCount !== 1 ? 's' : '');

  const zpl = generateZpl();
  document.getElementById('cmdCurlText').textContent = buildCurlCmd();
  document.getElementById('cmdLpText').textContent = buildLpCmd(zpl);

  if (document.getElementById('zplBox').style.display !== 'none') {
    document.getElementById('zplBox').textContent = zpl;
  }
}

// CAMPOS QUE ATUALIZAM A INTERFACE
[
  'labelText',
  'textCopies',
  'multiText',
  'seqPrefix',
  'seqStart',
  'seqEnd',
  'seqCopies',
  'width',
  'height',
  'fontSize'
].forEach(id => {
  document.getElementById(id).addEventListener('input', update);
});

// MOSTRAR / ESCONDER ZPL
function toggleZpl() {
  const box = document.getElementById('zplBox');
  const tog = document.querySelector('.toggle');
  const open = box.style.display === 'none';

  box.style.display = open ? 'block' : 'none';
  tog.textContent = open ? '▾ Hide ZPL' : '▸ Show ZPL';

  if (open) {
    box.textContent = generateZpl();
  }
}

// STATUS
function setStatus(msg, isError) {
  const s = document.getElementById('status');
  s.textContent = msg;
  s.className = 'status' + (isError ? ' error' : '');
}

// 1. ENVIAR DIRETO VIA HTTP POST
async function imprimirRede() {
  const zpl = generateZpl();
  const endpoint = getPrintEndpoint();

  if (!endpoint) {
    setStatus('Informe o IP/URL do Servidor Windows.', true);
    return;
  }

  const totalLabels = document.getElementById('previewBadge').textContent;
  setStatus(`Enviando ${totalLabels} para o servidor Windows...`, false);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: zpl
    });

    const result = await response.json();

    if (response.ok && result.status === 'success') {
      setStatus(`✓ ${totalLabels} enviada(s) e impressa(s) com sucesso!`, false);
    } else {
      setStatus('✖ Erro no servidor: ' + (result.message || 'Falha ao imprimir'), true);
    }
  } catch (err) {
    console.error(err);
    setStatus('✖ Não foi possível conectar ao servidor. Verifique a URL/IP e o Firewall.', true);
  }
}

// 2. BAIXAR ARQUIVO ZPL
function downloadZplFile() {
  const zpl = generateZpl();
  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = 'teste.zpl';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setStatus('✓ Arquivo "teste.zpl" baixado com sucesso!');
}

// 3. COPIAR CURL
function copyCurlCmd() {
  navigator.clipboard.writeText(buildCurlCmd())
    .then(() => setStatus('✓ Comando cURL copiado.'))
    .catch(() => setStatus('✖ Falha ao copiar.', true));
}

// 4. COPIAR LP
function copyLpCmd() {
  navigator.clipboard.writeText(buildLpCmd(generateZpl()))
    .then(() => setStatus('✓ Comando lp copiado.'))
    .catch(() => setStatus('✖ Falha ao copiar.', true));
}

// 5. COPIAR ZPL
function copyZpl() {
  navigator.clipboard.writeText(generateZpl())
    .then(() => setStatus('✓ Código ZPL copiado.'))
    .catch(() => setStatus('✖ Falha ao copiar.', true));
}

// INICIALIZAÇÃO
update();