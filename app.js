// app.js - NCM checker (local JSON + upload)
// Behavior:
// - Load ncm data from local file ncm.json (served with site) unless user previously uploaded a newer JSON (saved in localStorage).
// - Show "Base NCM vigente em: DD/MM/YYYY" using Data_Ultima_Atualizacao_NCM (if present) or derived info.
// - Allow user to upload a JSON; validate structure (must contain Nomenclaturas array).
// - On valid upload, keep it in localStorage and update UI. Offer a download link for the new ncm.json so user can commit it to GitHub.

const DATA_KEY = 'ncm_local_data_v1';

const el = id => document.getElementById(id);
const input = el('inputText');
const btn = el('btnProcess');
const btnClear = el('btnClear');
const status = el('status');
const resultsSection = el('results');
const tbody = document.querySelector('#table tbody');
const countEl = el('count');
const foundList = el('foundList');

const baseDateEl = el('baseDate');
const fileInput = el('fileInput');
const btnUpload = el('btnUpload');
const downloadBtn = el('downloadBtn');

btn.addEventListener('click', process);
btnClear.addEventListener('click', () => { input.value=''; reset(); });
btnUpload.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);

let ncmData = null;

async function init(){
  // Try localStorage first
  const stored = localStorage.getItem(DATA_KEY);
  if(stored){
    try{
      ncmData = JSON.parse(stored);
      setStatus('Tabela carregada (cache local).');
      updateBaseDate();
      prepareDownloadButton();
      return;
    }catch(e){
      console.warn('LocalStorage corrompido, descartando.');
      localStorage.removeItem(DATA_KEY);
    }
  }
  // Fallback: fetch ncm.json from server (repo)
  setStatus('Carregando ncm.json do repositório...');
  try{
    const r = await fetch('ncm.json', {cache: 'no-store'});
    if(!r.ok) throw new Error('Arquivo ncm.json não encontrado no servidor.');
    ncmData = await r.json();
    setStatus('Tabela carregada do arquivo local (repositório).');
    updateBaseDate();
    prepareDownloadButton();
    // persist a copy to localStorage so updates persist across page reload
    try { localStorage.setItem(DATA_KEY, JSON.stringify(ncmData)); } catch(e){}
  }catch(err){
    console.error(err);
    setStatus('Erro ao carregar ncm.json. Faça upload do arquivo.');
    baseDateEl.textContent = 'Base NCM vigente em: —';
  }
}

function setStatus(text){ status.textContent = text; }

function updateBaseDate(){
  if(!ncmData) return;
  // Prefer explicit metadata field
  const meta = ncmData.Data_Ultima_Atualizacao_NCM || ncmData.data_ultima_atualizacao_ncm || null;
  if(meta){
    baseDateEl.textContent = `Base NCM vigente em: ${meta}`;
    return;
  }
  // Try to extract the latest Data_Inicio from Nomenclaturas
  const arr = ncmData.Nomenclaturas || ncmData.nomenclaturas || [];
  let latest = null;
  for(const it of arr){
    const d = it.Data_Inicio || it.Data_Inicio || it.data_inicio || null;
    if(d){
      try{
        const dt = new Date(d);
        if(!isNaN(dt)){
          if(!latest || dt > latest) latest = dt;
        }
      }catch(e){}
    }
  }
  if(latest){
    const dd = latest.toISOString().slice(0,10).split('-').reverse().join('/');
    baseDateEl.textContent = `Base NCM vigente em: ${dd}`;
  } else {
    baseDateEl.textContent = 'Base NCM vigente em: —';
  }
}

function prepareDownloadButton(){
  const blob = new Blob([JSON.stringify(ncmData, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  downloadBtn.href = url;
  downloadBtn.classList.remove('hidden');
  // ensure download attribute set
  downloadBtn.setAttribute('download', 'ncm.json');
}

function reset(){
  tbody.innerHTML=''; resultsSection.classList.add('hidden'); setStatus('Aguardando...'); countEl.textContent='NCMs encontrados: 0'; foundList.textContent='';
}

function normalizeCode(code){
  const digits = code.replace(/\D/g,'');
  if(digits.length === 8) return digits;
  return digits;
}

function prettyFormat(code){
  const d = code.replace(/\D/g,'');
  if(d.length!==8) return code;
  return `${d.slice(0,4)}.${d.slice(4,6)}.${d.slice(6,8)}`;
}

function extractNcmCodes(text){
  const regex = /\b\d{2}\.?\d{2}\.?\d{2}\.?\d{2}\b/g;
  const matches = text.match(regex) || [];
  const normalized = [...new Set(matches.map(m => normalizeCode(m)).filter(Boolean))];
  return normalized;
}

function isVigente(item, referenceDate = new Date()){
  const start = item.Data_Inicio || item.data_inicio || item.DataInicio || null;
  const end = item.Data_Fim || item.data_fim || item.DataFim || null;
  const parse = s => s ? new Date(s) : null;
  const s = parse(start);
  const e = parse(end);
  if(s && referenceDate < s) return false;
  if(e && referenceDate > e) return false;
  return true;
}

function formatDateField(s){
  if(!s) return '-';
  const d = new Date(s);
  if(isNaN(d)) return s;
  return d.toISOString().slice(0,10);
}

function buildMap(){
  const arr = ncmData.Nomenclaturas || ncmData.nomenclaturas || ncmData;
  const map = new Map();
  if(Array.isArray(arr)){
    for(const it of arr){
      const code = (it.Codigo || it.codigo || '').toString().replace(/\D/g,'');
      if(code) map.set(code, it);
    }
  }
  return map;
}

async function process(){
  reset();
  const text = input.value.trim();
  if(!text){ setStatus('Cole algum texto contendo NCMs.'); return; }
  setStatus('Extraindo códigos...');
  const codes = extractNcmCodes(text);
  if(codes.length === 0){ setStatus('Nenhum NCM encontrado no texto.'); return; }

  setStatus(`Encontrados ${codes.length} NCM(s).`);
  resultsSection.classList.remove('hidden');
  countEl.textContent = `NCMs encontrados: ${codes.length}`;
  foundList.textContent = codes.map(c=>prettyFormat(c)).join(', ');

  if(!ncmData){
    setStatus('Nenhuma base NCM carregada. Faça upload do ncm.json.');
    return;
  }

  const map = buildMap();
  tbody.innerHTML = '';
  const today = new Date();

  for(const c of codes){
    const item = map.get(c);
    const tr = document.createElement('tr');
    const tdCode = document.createElement('td');
    tdCode.textContent = prettyFormat(c);

    const tdDesc = document.createElement('td');
    tdDesc.textContent = item ? (item.Descricao || item.descricao || item.Descrição || '—') : 'NCM não encontrado na tabela vigente';

    const tdVig = document.createElement('td');
    const vigente = item ? isVigente(item, today) : false;
    const span = document.createElement('span');
    span.className = 'badge ' + (vigente ? 'ok' : 'no');
    span.textContent = vigente ? 'Vigente' : 'Não vigente';
    tdVig.appendChild(span);

    const tdStart = document.createElement('td');
    tdStart.textContent = item ? formatDateField(item.Data_Inicio || item.data_inicio || item.DataInicio) : '-';
    const tdEnd = document.createElement('td');
    tdEnd.textContent = item ? formatDateField(item.Data_Fim || item.data_fim || item.DataFim) : '-';

    tr.appendChild(tdCode);
    tr.appendChild(tdDesc);
    tr.appendChild(tdVig);
    tr.appendChild(tdStart);
    tr.appendChild(tdEnd);
    tbody.appendChild(tr);
  }

  setStatus('Pronto.');
}

function handleFileUpload(e){
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = function(ev){
    try{
      const data = JSON.parse(ev.target.result);
      // basic validation: must have Nomenclaturas array
      if(!(data.Nomenclaturas && Array.isArray(data.Nomenclaturas))){
        alert('Arquivo inválido: não contém propriedade "Nomenclaturas" como array.');
        return;
      }
      // accept it
      ncmData = data;
      localStorage.setItem(DATA_KEY, JSON.stringify(ncmData));
      updateBaseDate();
      prepareDownloadButton();
      setStatus('Novo arquivo carregado e salvo no cache local. Para atualizar o repositório, baixe o arquivo e faça upload no GitHub.');
      alert('Arquivo válido. Você pode baixar o ncm.json e subir no repositório GitHub.');
    }catch(err){
      console.error(err);
      alert('Erro ao processar o arquivo. Certifique-se de que é um JSON válido.');
    }
  };
  reader.readAsText(f);
}

init();
