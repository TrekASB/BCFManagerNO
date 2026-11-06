(()=>{'use strict';
const BASE='https://open21.connect.trimble.com/bcf/3.0/projects/';
const ORIGIN=location.origin;
let api=null, token=null, project=null, popup=null, channel=null;
const $=id=>document.getElementById(id), status=t=>$('status').textContent=t;
function pickToken(p){const v=p?.data??p;return typeof v==='string'&&!['pending','denied'].includes(v)?v:(v?.accessToken||v?.access_token||null)}
function send(msg){if(popup&&!popup.closed)popup.postMessage({...msg,channel},ORIGIN)}
async function connect(){try{
 if(!window.TrimbleConnectWorkspace||window.parent===window)throw Error('Åpne extensionen fra Trimble Connect 3D Viewer.');
 api=await TrimbleConnectWorkspace.connect(window.parent,(event,args)=>{if(event==='extension.accessToken'){token=pickToken(args);if(token){status('Klar – tilgang mottatt');$('open').disabled=false;send({kind:'ready',project})}}});
 project=await api.project.getCurrentProject();$('project').textContent=project?.name||project?.id||'Ukjent';
 const v=await api.extension.requestPermission('accesstoken');token=pickToken(v);
 if(token){status('Klar – åpne saksbehandling');$('open').disabled=false}else status('Venter på tilgang til access token. Godkjenn forespørselen i Trimble Connect.');
 }catch(e){status('Feil: '+e.message)}}
$('open').onclick=()=>{if(!token||!project?.id)return;channel=crypto.randomUUID();popup=window.open('./manager.html#'+encodeURIComponent(channel),'BCFManager_'+project.id,'width=1600,height=960,resizable=yes,scrollbars=yes');if(!popup){status('Nettleseren blokkerte popup. Tillat popup for dette nettstedet.');return}status('Saksbehandling åpnet. Hold connectoren aktiv.');};
window.addEventListener('message',async event=>{
 if(event.origin!==ORIGIN||event.source!==popup||!popup||popup.closed)return;
 const m=event.data;if(!m||m.channel!==channel)return;
 if(m.kind==='hello'){send({kind:'ready',project:{id:project.id,name:project.name}});return}
 if(m.kind!=='request'||!token)return;
 const allowedMethods=['GET','PUT','POST'];const method=(m.method||'GET').toUpperCase();const sub=String(m.path||'');
 if(!allowedMethods.includes(method)||(!/^\/topics(?:\/[a-fA-F0-9-]+(?:\/(?:comments|viewpoints)(?:\/[a-fA-F0-9-]+(?:\/snapshot)?)?)?)?$/.test(sub)&&sub!=='/topics'&&sub!=='/extensions')) {send({kind:'reply',id:m.id,error:'Ugyldig API-sti'});return}
 if(method!=='GET'&&!m.confirmed){send({kind:'reply',id:m.id,error:'Skrivetillatelse mangler'});return}
 const url=BASE+encodeURIComponent(project.id)+sub;
 try{const headers={Authorization:'Bearer '+token,Accept:m.binary?'image/png':'application/json'};
 if(m.body!=null)headers['Content-Type']='application/json';
 const res=await fetch(url,{method,headers,body:m.body!=null?JSON.stringify(m.body):undefined});
 if(!res.ok)throw Error('Trimble API HTTP '+res.status+': '+(await res.text()).slice(0,350));
 if(m.binary){const blob=await res.blob();const reader=new FileReader();reader.onload=()=>send({kind:'reply',id:m.id,result:reader.result});reader.onerror=()=>send({kind:'reply',id:m.id,error:'Kunne ikke lese bilde'});reader.readAsDataURL(blob)}
 else send({kind:'reply',id:m.id,result:res.status===204?null:await res.json()});
 }catch(e){send({kind:'reply',id:m.id,error:e.message})}
});connect();
})();