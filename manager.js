(()=>{'use strict';
const $=id=>document.getElementById(id);const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const channel=decodeURIComponent(location.hash.slice(1));const origin=location.origin;let project=null,topics=[],filtered=[],selected=new Set(),active=null,sortDesc=false;const snapshotCache=new Map();
const pending=new Map();let seq=0;let extensions={};
function toast(m){$('toast').textContent=m;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',4500)}
function call(path,method='GET',body=null,binary=false,confirmed=false){return new Promise((resolve,reject)=>{if(!window.opener||window.opener.closed)return reject(Error('Connectoren er lukket. Åpne BCFManager på nytt fra Trimble Connect.'));const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Tidsavbrudd ved API-kall'))},60000);pending.set(id,{resolve,reject,timer});window.opener.postMessage({kind:'request',channel,id,path,method,body,binary,confirmed},origin)})}
window.addEventListener('message',e=>{if(e.origin!==origin||e.source!==window.opener||e.data?.channel!==channel)return;const m=e.data;if(m.kind==='ready'){project=m.project;$('context').textContent=(project.name||project.id)+' · Tilkoblet';load()}else if(m.kind==='reply'){const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error)):p.resolve(m.result)}});
function duplicateKey(t){let s=(t.title||'').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,' ').trim();return s.length>=12?s:null}
function duplicates(){const counts=new Map();for(const t of topics){const k=duplicateKey(t);if(k)counts.set(k,(counts.get(k)||0)+1)}return new Set(topics.filter(t=>{const k=duplicateKey(t);return k&&counts.get(k)>1}).map(t=>t.guid))}
function date(t){return t?.slice?.(0,16)?.replace('T',' ')||'–'}function unique(a){return [...new Set(a.filter(Boolean))].sort()}
function allowed(field){const v=extensions[field];return Array.isArray(v)?v.map(x=>typeof x==='string'?x:(x?.name||x?.value||'')).filter(Boolean):[]}
function projectValues(field){return unique([...allowed(field),...topics.map(t=>t[field])])}
function opts(cur,arr){return unique([cur,...arr]).map(s=>'<option '+(s===cur?'selected':'')+' value="'+esc(s)+'">'+esc(s)+'</option>').join('')}
function deadline(t){return t.due_date||''}
function dueGroup(t){const d=deadline(t);if(!d)return 'missing';const today=new Date();today.setHours(0,0,0,0);const dt=new Date(d.slice(0,10)+'T00:00:00');const delta=(dt-today)/86400000;return delta<0?'overdue':delta<=7?'next7':'later'}
function cmp(a,b,key){const x=String(key==='index'?(a.index??''):a[key]??'').toLocaleLowerCase('nb');const y=String(key==='index'?(b.index??''):b[key]??'').toLocaleLowerCase('nb');return x.localeCompare(y,'nb',{numeric:true})}
function setFilterOptions(id,values,label){const old=$(id).value;$(id).innerHTML='<option value="">'+label+'</option>'+unique(values).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');$(id).value=old}
function render(){const q=$('search').value.toLowerCase(),st=$('statusFilter').value,tp=$('typeFilter').value,pr=$('priorityFilter').value,as=$('assigneeFilter').value,dl=$('deadlineFilter').value,dups=duplicates();
filtered=topics.filter(t=>(!st||t.topic_status===st)&&(!tp||t.topic_type===tp)&&(!pr||t.priority===pr)&&(!as||t.assigned_to===as)&&(!dl||(dl==='next7'?dueGroup(t)==='next7':dueGroup(t)===dl))&&(!$('duplicates').checked||dups.has(t.guid))&&JSON.stringify([t.title,t.description,t.assigned_to,t.guid,t.labels,t.topic_type,t.due_date]).toLowerCase().includes(q));
const sort=$('sortBy').value;filtered.sort((a,b)=>(sortDesc?-1:1)*cmp(a,b,sort));
$('sortDirection').textContent=sortDesc?'↓':'↑';
$('stats').textContent=filtered.length+' av '+topics.length+' saker · '+dups.size+' med mulig duplikat · '+selected.size+' valgt';
$('rows').innerHTML=filtered.map(t=>'<tr><td><input type="checkbox" data-select="'+esc(t.guid)+'" '+(selected.has(t.guid)?'checked':'')+'></td><td>'+esc(t.index??t.guid?.slice(0,8))+'</td><td class="title"><a href="#" data-open="'+esc(t.guid)+'">'+esc(t.title||'Uten tittel')+'</a></td><td><select data-field="topic_status" data-id="'+esc(t.guid)+'">'+opts(t.topic_status,projectValues('topic_status'))+'</select></td><td>'+esc(t.topic_type||'–')+'</td><td><select data-field="priority" data-id="'+esc(t.guid)+'">'+opts(t.priority,projectValues('priority'))+'</select></td><td>'+esc(t.assigned_to||'–')+'</td><td class="'+(dueGroup(t)==='overdue'?'overdue':'')+'">'+esc(deadline(t)?date(deadline(t)):'–')+'</td><td>'+esc((t.labels||[]).join(', '))+'</td><td>'+esc(date(t.modify_date||t.creation_date))+'</td><td>'+(dups.has(t.guid)?'<span class="badge">Mulig duplikat</span>':'')+'</td></tr>').join('');
$('bulk').disabled=selected.size===0;
}
async function load(){try{$('context').textContent=(project?.name||project?.id||'Prosjekt')+' · Henter Topics…';const [res,ext]=await Promise.all([call('/topics'),call('/extensions').catch(e=>{toast('Kunne ikke hente prosjektets valg: '+e.message);return {}})]);extensions=ext||{};topics=Array.isArray(res)?res:Array.isArray(res?.items)?res.items:[];$('statusFilter').innerHTML='<option value="">Alle statuser</option>'+projectValues('topic_status').map(x=>'<option>'+esc(x)+'</option>').join('');$('context').textContent=(project?.name||project?.id||'Prosjekt')+' · '+topics.length+' saker';setFilterOptions('typeFilter',projectValues('topic_type'),'Alle sakstyper');setFilterOptions('priorityFilter',projectValues('priority'),'Alle prioriteter');setFilterOptions('assigneeFilter',unique([...allowed('users'),...topics.map(t=>t.assigned_to)]),'Alle ansvarlige');render()}catch(e){toast(e.message);$('context').textContent='Kunne ikke hente saker: '+e.message}}
async function persistTopic(guid,patch){
 const original=topics.find(t=>t.guid===guid);if(!original)throw Error('Saken finnes ikke i listen');
 const latest=await call('/topics/'+guid);
 if(!latest||latest.guid!==guid)throw Error('Kunne ikke hente siste versjon av saken');
 const body={topic_type:latest.topic_type,topic_status:latest.topic_status,title:latest.title,priority:latest.priority,assigned_to:latest.assigned_to,labels:Array.isArray(latest.labels)?latest.labels:[],due_date:latest.due_date,...patch};
 Object.keys(body).forEach(k=>{if(body[k]===undefined)delete body[k]});
 await call('/topics/'+guid,'PUT',body,false,true);
 const saved=await call('/topics/'+guid);
 for(const [k,v] of Object.entries(patch)){const actual=saved[k];if(JSON.stringify(actual??null)!==JSON.stringify(v??null))throw Error('Trimble returnerte en annen verdi for '+k+'. Kontroller saken før videre redigering.')}
 Object.assign(original,saved);render();return saved;
}
function editableSelect(id,field,current,values){return '<label class="edit-label">'+esc(field)+'<select id="'+id+'">'+opts(current,values)+'</select></label>'}
function editingForm(t){
 const status=projectValues('topic_status'),priority=projectValues('priority');
 const assignees=unique([...allowed('users'),...topics.map(x=>x.assigned_to)]);
 return '<section class="edit-panel"><h3>Rediger sak</h3><p class="muted">Lagring oppdaterer BCF Topics direkte. Velg ett eller flere felt og trykk Lagre.</p>'+
 editableSelect('editStatus','Status',t.topic_status,status)+editableSelect('editType','Type sak',t.topic_type,projectValues('topic_type'))+editableSelect('editPriority','Prioritet',t.priority,priority)+
 '<label class="edit-label">Ansvarlig<input id="editAssignee" list="usersList" value="'+esc(t.assigned_to||'')+'" placeholder="E-post / bruker-ID"></label>'+
 '<datalist id="usersList">'+assignees.map(x=>'<option value="'+esc(x)+'"></option>').join('')+'</datalist>'+
 '<label class="edit-label">Fag (BCF Tags / labels)<input id="editLabels" value="'+esc((t.labels||[]).join(', '))+'" placeholder="Veg, VA, Konstruksjon"></label>'+
 '<label class="edit-label">Tidsfrist<input id="editDue" type="date" value="'+esc((t.due_date||'').slice(0,10))+'"></label>'+
 '<button id="saveTopic">Lagre endringer i Trimble Connect</button><p id="saveResult" role="status"></p></section>';
}
async function saveEditor(guid){
 const current=topics.find(t=>t.guid===guid);if(!current)return;
 const labels=$('editLabels').value.split(',').map(x=>x.trim()).filter(Boolean);
 const due=$('editDue').value;
 const desired={topic_status:$('editStatus').value,topic_type:$('editType').value,priority:$('editPriority').value,assigned_to:$('editAssignee').value.trim(),labels,due_date:due?due+'T12:00:00Z':null};
 const patch={};for(const [k,v] of Object.entries(desired))if(JSON.stringify(v??null)!==JSON.stringify(current[k]??null) && !(k==='due_date'&&v&&String(current[k]||'').slice(0,10)===due))patch[k]=v;
 if(!Object.keys(patch).length){$('saveResult').textContent='Ingen endringer å lagre.';return}
 if(!confirm('Lagre '+Object.keys(patch).join(', ')+' direkte i Trimble Connect?'))return;
 const btn=$('saveTopic');btn.disabled=true;$('saveResult').textContent='Lagrer og kontrollerer …';
 try{await persistTopic(guid,patch);toast('Bekreftet lagret i BCF Topics');if(active?.guid===guid)choose(guid)}
 catch(e){$('saveResult').textContent='Feil: '+e.message;toast('Lagring mislyktes: '+e.message)}
 finally{btn.disabled=false}
}
function modelUrl(guid){return 'https://web.connect.trimble.com/projects/'+encodeURIComponent(project.id)+'/topics/'+encodeURIComponent(guid)}
async function getSnapshot(topicGuid,viewGuid){const key=topicGuid+'/'+viewGuid;if(snapshotCache.has(key))return snapshotCache.get(key);const data=await call('/topics/'+topicGuid+'/viewpoints/'+viewGuid+'/snapshot','GET',null,true);snapshotCache.set(key,data);return data}
async function choose(guid){active=topics.find(t=>t.guid===guid);if(!active)return;const t=active;
$('detail').innerHTML='<h2>'+esc(t.title)+'</h2><p><b>Type:</b> '+esc(t.topic_type||'–')+' · <b>Frist:</b> '+esc(deadline(t)||'–')+'</p><p><b>Status:</b> '+esc(t.topic_status)+' · <b>Ansvarlig:</b> '+esc(t.assigned_to||'–')+'</p><p>'+esc(t.description||'Ingen beskrivelse')+'</p>'+editingForm(t)+'<p><a class="model-link" href="'+esc(modelUrl(guid))+'" target="_blank" rel="noopener noreferrer">Åpne saken i Trimble Connect / modellen ↗</a></p><h3>Lagrede BCF-bilder</h3><div id="pictures">Henter viewpoints…</div><h3>Kommentarer</h3><div id="comments">Henter …</div><textarea id="newComment" placeholder="Ny kommentar"></textarea><button id="saveComment">Legg til kommentar</button>';
$('saveTopic').onclick=()=>saveEditor(guid);$('saveComment').onclick=async()=>{const comment=$('newComment').value.trim();if(!comment)return;if(!confirm('Legge til denne kommentaren direkte i Trimble Connect?'))return;try{await call('/topics/'+guid+'/comments','POST',{comment},false,true);await call('/topics/'+guid+'/comments');toast('Kommentar lagret i Trimble Connect');choose(guid)}catch(e){toast('Lagring feilet: '+e.message)}};
const a=await Promise.allSettled([call('/topics/'+guid+'/comments'),call('/topics/'+guid+'/viewpoints')]);if(active?.guid!==guid)return;
$('comments').innerHTML=a[0].status==='fulfilled'?(Array.isArray(a[0].value)?a[0].value:[]).map(c=>'<p><b>'+esc(c.author||'Ukjent')+'</b> '+esc(date(c.date))+'<br>'+esc(c.comment||'')+'</p>').join('')||'<p>Ingen kommentarer</p>':'<p class="error">Kommentarer kunne ikke hentes</p>';
const vv=a[1].status==='fulfilled'&&Array.isArray(a[1].value)?a[1].value:[];$('pictures').innerHTML=vv.length?vv.map((v,i)=>'<div class="snapshot"><div id="snap-'+i+'">Laster bilde '+(i+1)+' …</div><button class="secondary" data-snapshot="'+esc(v.guid)+'">Åpne originalbilde ↗</button></div>').join(''):'<p>Ingen lagrede viewpoints, eller API-kallet ble avvist.</p>';
$('pictures').querySelectorAll('[data-snapshot]').forEach(b=>b.onclick=()=>showImage(guid,b.dataset.snapshot));
vv.forEach(async(v,i)=>{try{const data=await getSnapshot(guid,v.guid);if(active?.guid!==guid)return;const img=new Image();img.src=data;img.className='preview-image';img.alt='BCF snapshot';img.title='Klikk for å åpne i fullt vindu';img.onclick=()=>showImage(guid,v.guid);img.onload=()=>{img.title+=' · '+img.naturalWidth+' × '+img.naturalHeight+' piksler'};const el=$('snap-'+i);if(el){el.textContent='';el.appendChild(img)}}catch(e){const el=$('snap-'+i);if(el)el.textContent='Bilde utilgjengelig: '+e.message}});
}
async function showImage(topicGuid,viewGuid){const w=window.open('','_blank','width=1500,height=1000');if(!w){toast('Tillat popup for dette nettstedet');return}w.document.title='BCF snapshot – originalstørrelse';w.document.body.textContent='Henter BCF-bilde…';try{const data=await getSnapshot(topicGuid,viewGuid);w.document.body.innerHTML='';w.document.body.style='margin:0;background:#151c28;color:white;font:14px system-ui';const toolbar=w.document.createElement('div');toolbar.style='padding:10px;position:sticky;top:0;background:#222d3c';toolbar.textContent='BCF snapshot – original pikseloppløsning · ';const dimension=w.document.createElement('span');toolbar.appendChild(dimension);w.document.body.appendChild(toolbar);const img=w.document.createElement('img');img.src=data;img.style='display:block;margin:auto;max-width:none;height:auto;image-rendering:auto;cursor:zoom-in';img.onload=()=>{dimension.textContent=img.naturalWidth+' × '+img.naturalHeight+' px (nettleserzoom Ctrl +/-). Høyere oppløsning krever større kildebilde.'};w.document.body.appendChild(img)}catch(e){w.document.body.textContent='Bildet kunne ikke hentes: '+e.message}}
$('rows').addEventListener('click',e=>{const x=e.target.closest('[data-open]');if(x){e.preventDefault();choose(x.dataset.open)}});
$('rows').addEventListener('change',async e=>{const t=e.target;if(t.dataset.select){t.checked?selected.add(t.dataset.select):selected.delete(t.dataset.select);render();return}if(t.dataset.field){const topic=topics.find(x=>x.guid===t.dataset.id),before=topic[t.dataset.field];if(!confirm('Endre '+t.dataset.field+' for «'+topic.title+'» direkte i Trimble Connect?')){t.value=before;return}try{await persistTopic(topic.guid,{[t.dataset.field]:t.value});toast('Endring bekreftet lagret');if(active?.guid===topic.guid)choose(topic.guid)}catch(err){t.value=before;toast('Kunne ikke lagre: '+err.message)}}});
['search','statusFilter','typeFilter','priorityFilter','assigneeFilter','deadlineFilter','sortBy','duplicates'].forEach(k=>$(k).addEventListener('input',render));$('refresh').onclick=load;$('sortDirection').onclick=()=>{sortDesc=!sortDesc;render()};document.querySelectorAll('[data-sort]').forEach(th=>th.onclick=()=>{const key=th.dataset.sort;if($('sortBy').value===key)sortDesc=!sortDesc;else{$('sortBy').value=key;sortDesc=false}render()});
$('all').onchange=e=>{for(const t of filtered)e.target.checked?selected.add(t.guid):selected.delete(t.guid);render()};
$('bulk').onclick=async()=>{const status=prompt('Ny status for valgte saker (nøyaktig statusnavn fra prosjektet):');if(!status)return;if(!confirm('Oppdatere '+selected.size+' saker til «'+status+'»? Dette endrer prosjektdata.'))return;let ok=0,fail=0;for(const guid of [...selected]){try{await persistTopic(guid,{topic_status:status});ok++}catch(e){fail++}}toast('Oppdatert '+ok+', feilet '+fail+'. Kontroller statusnavn og rettigheter.');selected.clear();await load()};
$('export').onclick=()=>{const keys=['guid','title','topic_status','priority','assigned_to','topic_type','due_date','creation_date','modify_date'];const csv=[keys.join(';'),...filtered.map(t=>keys.map(k=>'"'+String(t[k]??'').replaceAll('"','""')+'"').join(';'))].join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='BCFManager_topics.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
if(!channel||!window.opener)$('context').textContent='Åpne BCFManager via Trimble Connect-extensionen.';else window.opener.postMessage({kind:'hello',channel},origin);
})();