$ErrorActionPreference='Stop'
Set-Location 'C:\Users\user\OneDrive\Desktop\untitled'

$files=@(
 'src\pages\portal\CommunicationCenterV3.tsx',
 'src\pages\portal\CommunicationCenterV4.tsx',
 'src\pages\portal\MessagesV4.tsx',
 'src\pages\portal\MessagesV5.tsx'
)

$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
foreach($p in $files){
  if(Test-Path $p){Copy-Item $p "$p.before-parser-repair-$stamp.bak" -Force}
}

$base='https://raw.githubusercontent.com/StanleyMainaSM/NexaWebStudioo/avelixa-local-debug/'

function Get-RemoteFile([string]$path){
  $tmp=Join-Path $env:TEMP ("avelixa-" + [IO.Path]::GetRandomFileName())
  try {
    Invoke-WebRequest -UseBasicParsing ($base + $path.Replace('\','/')) -OutFile $tmp
    return Get-Content $tmp -Raw
  } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

# Restore these files from the latest debug branch, then repair only the known syntax/state defects.
$v3=Get-RemoteFile 'src/pages/portal/CommunicationCenterV3.tsx'
$v3=$v3.Replace("Enter the person's name and email.","Enter the person\'s name and email.")
Set-Content $files[0] $v3 -Encoding UTF8

$v4=Get-RemoteFile 'src/pages/portal/CommunicationCenterV4.tsx'
$v4=$v4.Replace('FormEvent, useEffect, useMemo, useRef, useState, lazy, Suspense','FormEvent, useEffect, useMemo, useRef, useState')
$v4=$v4.Replace("import type { ActiveCall } from '../../components/portal/CallOverlayV2';`r`nconst CallOverlay=lazy(()=>import('../../components/portal/CallOverlayV2'));`r`n",'')
$v4=$v4.Replace(",[activeCall,setActiveCall]=useState<ActiveCall|null>(null),[incoming,setIncoming]=useState<CallEvent|null>(null)",'')
$v4=$v4.Replace("setActiveCall({id:data.id,callType:type,callerId:user.id,calleeId:selected.otherUserId,remoteName:displaySelected,isIncoming:false,directConversationId:selected.kind==='direct'?selected.id:null,adminConversationId:selected.kind==='admin'?selected.id:null})",'')
$v4=$v4.Replace("if(c.callee_id===user.id&&c.status==='ringing')setIncoming({...c,conversation_id:cid})",'')
$v4=$v4.Replace("if(incoming?.id===c.id&&c.status!=='ringing')setIncoming(null)",'')
$v4=$v4.Replace("},[user?.id,selectedId,incoming?.id]);","},[user?.id,selectedId]);")
$v4=$v4.Replace("useEffect(()=>{if(!user)return;let alive=true;(async()=>{try{await supabase.rpc('communication_set_presence',{p_online:true});await Promise.all([loadConvos(),refreshContacts()])}catch(e){if(alive)setError(er(e))}finally{if(alive)setLoading(false)}})();const heartbeat=window.setInterval(()=>void supabase.rpc('communication_set_presence',{p_online:true}),25000);const off=()=>{void supabase.rpc('communication_set_presence',{p_online:false})};window.addEventListener('beforeunload',off);return()=>{alive=false;window.clearInterval(heartbeat);window.removeEventListener('beforeunload',off);off()}},[user?.id,management]);", "useEffect(()=>{if(!user)return;let alive=true;(async()=>{try{await Promise.all([loadConvos(),refreshContacts()])}catch(e){if(alive)setError(er(e))}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[user?.id,management]);")
$v4=[regex]::Replace($v4,"\}\{incoming&&<Suspense fallback=\{null\}><CallOverlay[\s\S]*?</Suspense>\}\{activeCall&&<Suspense fallback=\{null\}><CallOverlay[\s\S]*?</Suspense>\}", '')
# The realtime call history handlers remain; only the page-local overlay state is removed.
$v4=$v4.Replace("}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_presence'},({new:p}:any)=>setContacts", "}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_presence'},({new:p}:any)=>setContacts")
Set-Content $files[1] $v4 -Encoding UTF8

$mv4=Get-RemoteFile 'src/pages/portal/MessagesV4.tsx'
$mv4=$mv4.Replace("last_seen_at:p.last_seen_at}}:v).subscribe();", "last_seen_at:p.last_seen_at}}:v)).subscribe();")
Set-Content $files[2] $mv4 -Encoding UTF8

$mv5=Get-RemoteFile 'src/pages/portal/MessagesV5.tsx'
$mv5=$mv5.Replace("setUnread(v=>({...v,[m.conversation_id]:(v[m.conversation_id]||0)+1))", "setUnread(v=>({...v,[m.conversation_id]:(v[m.conversation_id]||0)+1}))")
Set-Content $files[3] $mv5 -Encoding UTF8

# Assertions: stop if any known parser-corruption signatures remain.
$check=@{}
foreach($p in $files){$check[$p]=Get-Content $p -Raw}
if($check[$files[0]] -match "Enter the person's name") { throw 'V3 apostrophe syntax defect remains.' }
if($check[$files[1]] -match 'CallOverlay|activeCall|incoming') { throw 'CommunicationCenterV4 still contains page-local call overlay state.' }
if($check[$files[1]] -match 'communication_set_presence') { throw 'CommunicationCenterV4 still owns presence state.' }

Write-Host ''
Write-Host 'Parser repair applied to the four affected communication files.' -ForegroundColor Green
Write-Host 'Backups were created before each replacement.'
Write-Host ''
Write-Host 'Run: npm run typecheck' -ForegroundColor Cyan
