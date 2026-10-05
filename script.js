const STORAGE_KEY = 'sayaka-desk-apps-v2';
const isEditMode = new URLSearchParams(location.search).get('edit') === '1';
let apps = loadApps();
let activeCategory = 'ALL';
let editingId = null;
let pendingImage = '';

const grid = document.getElementById('appGrid');
const chips = document.getElementById('categoryChips');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const appCount = document.getElementById('appCount');
const resetBtn = document.getElementById('resetBtn');
const editorBar = document.getElementById('editorBar');
const dialog = document.getElementById('editDialog');
const form = document.getElementById('editForm');

function loadApps(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(Array.isArray(saved) && saved.length) return saved;
  }catch(e){}
  return structuredClone(DEFAULT_APPS);
}
function saveApps(){localStorage.setItem(STORAGE_KEY,JSON.stringify(apps));}
function uid(){return 'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function escapeHtml(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function safeUrl(value){const v=String(value||'').trim();return v || '#';}

function getCategories(){
  const base=['CORE','TOOLS','ENGLISH','SCHOOL','AI','CREATE','IDEAS'];
  const extra=[...new Set(apps.map(a=>(a.category||'OTHER').trim().toUpperCase()).filter(Boolean))].filter(c=>!base.includes(c));
  return ['ALL',...base,...extra];
}
function populateCategorySelect(selected='TOOLS'){
  const select=document.getElementById('categoryField');
  const cats=getCategories().filter(c=>c!=='ALL');
  select.innerHTML=cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')+'<option value="__NEW__">＋ 新しいカテゴリ</option>';
  select.value=cats.includes(selected)?selected:'__NEW__';
  const row=document.getElementById('newCategoryRow');
  row.hidden=select.value!=='__NEW__';
}
function renderChips(){
  const categories=getCategories();
  if(!categories.includes(activeCategory)) activeCategory='ALL';
  chips.innerHTML=categories.map(cat=>`<button class="chip ${cat===activeCategory?'active':''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`).join('');
  chips.querySelectorAll('.chip').forEach(btn=>btn.addEventListener('click',()=>{activeCategory=btn.dataset.category;renderChips();renderApps();}));
}
function iconHtml(app){return app.image?`<img src="${app.image}" alt="">`:`<i data-lucide="${escapeHtml(app.icon||'app-window')}"></i>`;}
function renderApps(){
  const q=searchInput.value.trim().toLowerCase();
  const pool=isEditMode?apps:apps.filter(a=>a.visible!==false);
  const visible=pool.filter(app=>{
    const cat=(app.category||'OTHER').toUpperCase();
    return (activeCategory==='ALL'||cat===activeCategory)&&(!q||`${app.title} ${cat}`.toLowerCase().includes(q));
  });
  grid.innerHTML=visible.map(app=>{
    const hidden=isEditMode&&app.visible===false;
    const target=isEditMode?'':'target="_blank" rel="noopener noreferrer"';
    return `<a class="app-card ${hidden?'is-hidden':''}" href="${isEditMode?'#':escapeHtml(safeUrl(app.url))}" ${target} data-id="${escapeHtml(app.id)}" data-color="${escapeHtml(app.color||'amber')}">
      <div class="app-icon">${iconHtml(app)}</div><div class="app-meta"><h3>${escapeHtml(app.title)}</h3></div><span class="app-arrow">↗</span>${isEditMode?'<span class="edit-badge">✎</span>':''}</a>`;
  }).join('');
  appCount.textContent=String(visible.length);
  emptyState.hidden=visible.length!==0;
  if(window.lucide) lucide.createIcons({attrs:{'stroke-width':1.8}});
  if(isEditMode) grid.querySelectorAll('.app-card').forEach(card=>card.addEventListener('click',e=>{e.preventDefault();openEditor(card.dataset.id);}));
}

function openEditor(id){
  editingId=id;
  const app=apps.find(a=>a.id===id);
  if(!app)return;
  pendingImage=app.image||'';
  document.getElementById('dialogTitle').textContent='アプリを編集';
  document.getElementById('titleField').value=app.title||'';
  document.getElementById('urlField').value=app.url==='#'?'':app.url||'';
  populateCategorySelect((app.category||'TOOLS').toUpperCase());
  document.getElementById('newCategoryField').value='';
  document.getElementById('colorField').value=app.color||'amber';
  document.getElementById('iconField').value=app.icon||'app-window';
  document.getElementById('visibleField').checked=app.visible!==false;
  document.getElementById('deleteBtn').hidden=false;
  updatePreview();dialog.showModal();
}
function openNew(){
  editingId=null;pendingImage='';
  document.getElementById('dialogTitle').textContent='アプリを追加';
  form.reset();
  document.getElementById('colorField').value='amber';document.getElementById('iconField').value='app-window';populateCategorySelect('TOOLS');document.getElementById('newCategoryField').value='';document.getElementById('visibleField').checked=true;
  document.getElementById('deleteBtn').hidden=true;
  updatePreview();dialog.showModal();
}
function updatePreview(){
  const preview=document.getElementById('iconPreview');
  const icon=document.getElementById('iconField').value.trim()||'app-window';
  preview.innerHTML=pendingImage?`<img src="${pendingImage}" alt="">`:`<i data-lucide="${escapeHtml(icon)}"></i>`;
  if(window.lucide) lucide.createIcons({attrs:{'stroke-width':1.8}});
}

document.getElementById('categoryField').addEventListener('change',e=>{document.getElementById('newCategoryRow').hidden=e.target.value!=='__NEW__';if(e.target.value==='__NEW__')document.getElementById('newCategoryField').focus();});

document.getElementById('iconField').addEventListener('input',updatePreview);
document.getElementById('iconUpload').addEventListener('change',e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>900*1024){alert('画像は900KB以下がおすすめです。');}
  const reader=new FileReader();reader.onload=()=>{pendingImage=reader.result;updatePreview();};reader.readAsDataURL(file);
});
document.getElementById('clearImageBtn').addEventListener('click',()=>{pendingImage='';document.getElementById('iconUpload').value='';updatePreview();});

form.addEventListener('submit',e=>{
  e.preventDefault();
  const categorySelect=document.getElementById('categoryField').value;
  const newCategory=document.getElementById('newCategoryField').value.trim().toUpperCase();
  const category=categorySelect==='__NEW__'?(newCategory||'OTHER'):categorySelect;
  const data={
    id:editingId||uid(),title:document.getElementById('titleField').value.trim(),subtitle:'',url:safeUrl(document.getElementById('urlField').value),category,color:document.getElementById('colorField').value,icon:document.getElementById('iconField').value.trim()||'app-window',image:pendingImage,visible:document.getElementById('visibleField').checked
  };
  if(editingId){const i=apps.findIndex(a=>a.id===editingId);apps[i]=data;}else apps.push(data);
  saveApps();dialog.close();renderChips();renderApps();
});
document.getElementById('deleteBtn').addEventListener('click',()=>{if(!editingId)return;if(confirm('このアプリを削除しますか？')){apps=apps.filter(a=>a.id!==editingId);saveApps();dialog.close();renderChips();renderApps();}});
document.getElementById('cancelBtn').addEventListener('click',()=>dialog.close());document.getElementById('closeDialogBtn').addEventListener('click',()=>dialog.close());

document.getElementById('addAppBtn').addEventListener('click',openNew);
document.getElementById('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({version:2,apps},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sayaka-desk-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
});
document.getElementById('importInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{const data=JSON.parse(await file.text());const imported=Array.isArray(data)?data:data.apps;if(!Array.isArray(imported))throw new Error();apps=imported;saveApps();renderChips();renderApps();alert('読み込みました。');}catch(err){alert('JSONファイルを読み込めませんでした。');}e.target.value='';
});
document.getElementById('restoreBtn').addEventListener('click',()=>{if(confirm('初期状態に戻しますか？ 現在の編集内容は消えます。')){apps=structuredClone(DEFAULT_APPS);saveApps();activeCategory='ALL';renderChips();renderApps();}});

searchInput.addEventListener('input',renderApps);resetBtn.addEventListener('click',()=>{searchInput.value='';activeCategory='ALL';renderChips();renderApps();});
function tick(){const now=new Date();document.getElementById('dateLabel').textContent=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(now);document.getElementById('timeLabel').textContent=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;}

if(isEditMode){editorBar.hidden=false;document.body.classList.add('edit-mode');}
renderChips();renderApps();tick();setInterval(tick,30000);
if(window.lucide) lucide.createIcons({attrs:{'stroke-width':1.8}});
