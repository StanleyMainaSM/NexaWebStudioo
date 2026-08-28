$ErrorActionPreference = 'Stop'
Set-Location 'C:\Users\user\OneDrive\Desktop\untitled'

$messagesPath = 'src\pages\portal\MessagesV6.tsx'
$portalPath = 'src\pages\portal\PortalLayout.tsx'
$globalPath = 'src\components\portal\GlobalCallManager.tsx'

Copy-Item $messagesPath "$messagesPath.before-global-call-fix.bak" -Force
Copy-Item $portalPath "$portalPath.before-global-call-fix.bak" -Force

$raw = 'https://raw.githubusercontent.com/StanleyMainaSM/NexaWebStudioo/avelixa-local-debug/src/components/portal/GlobalCallManager.tsx'
Invoke-WebRequest -UseBasicParsing $raw -OutFile $globalPath

$p = Get-Content $portalPath -Raw
if ($p -notmatch 'GlobalCallManager') {
  $p = $p -replace "import \{ usePortalRealtimeRefresh \} from '../../lib/usePortalRealtime';", "import { usePortalRealtimeRefresh } from '../../lib/usePortalRealtime';`r`nimport GlobalCallManager from '../../components/portal/GlobalCallManager';"
}
$p = $p -replace "supabase\.from\('notifications'\)\.select\('id', \{ count: 'exact', head: true \}\)\.eq\('user_id', user\.id\)\.eq\('is_read', false\)\.in\('notification_type', \['message', 'call'\]\)", "supabase.from('direct_messages').select('id', { count: 'exact', head: true }).neq('sender_id', user.id).is('read_at', null)"
$p = $p -replace "\.on\('postgres_changes', \{ event: '\*', schema: 'public', table: 'notifications', filter: `user_id=eq\.\$\{user\.id\}` \}, \(\) => void refresh\(\)\)", ".on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => void refresh())"
if ($p -notmatch '<GlobalCallManager') {
  $p = $p -replace '<main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">', '<GlobalCallManager /><main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">'
}
Set-Content $portalPath $p -Encoding UTF8

$m = Get-Content $messagesPath -Raw
$m = [regex]::Replace($m, "import CallOverlayV2, \{ ActiveCall \} from '../../components/portal/CallOverlayV2';\r?\n", '')
$m = [regex]::Replace($m, ",\[activeCall,setActiveCall\]=useState<ActiveCall\|null>\(null\),\[incoming,setIncoming\]=useState<Call\|null>\(null\)", '')
$m = [regex]::Replace($m, "useEffect\(\(\)=>\{if\(!user\)return;void supabase\.rpc\('communication_set_presence',\{p_online:true\}\);void initialLoad\(\);const heartbeat=window\.setInterval\(\(\)=>void supabase\.rpc\('communication_set_presence',\{p_online:true\}\),25000\);const off=\(\)=>void supabase\.rpc\('communication_set_presence',\{p_online:false\}\);window\.addEventListener\('beforeunload',off\);return\(\)=>\{window\.clearInterval\(heartbeat\);window\.removeEventListener\('beforeunload',off\);void supabase\.rpc\('communication_set_presence',\{p_online:false\}\)\}\},\[user\?\.id,initialLoad\]\);", "useEffect(()=>{if(!user)return;void initialLoad();},[user?.id,initialLoad]);")
$m = [regex]::Replace($m, "\.on\('postgres_changes',\{event:'UPDATE',schema:'public',table:'user_presence'\},\(\{new:p\}:any\)=>setPeople\(v=>v\[p\.user_id\]\?\{\.\.\.v,\[p\.user_id\]:\{\.\.\.v\[p\.user_id\],is_online:!!p\.is_online,last_seen_at:p\.last_seen_at\|\|null\}\}:v\)\)", ".on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_presence'},({new:p}:any)=>{if(p?.user_id)void loadPeople([p.user_id]);})")
$m = [regex]::Replace($m, "\.on\('postgres_changes',\{event:'INSERT',schema:'public',table:'call_sessions'\},\(\{new:c\}:any\)=>\{if\(c\.callee_id===user\.id&&c\.status==='ringing'\)setIncoming\(c as Call\);if\(c\.direct_conversation_id===selectedRef\.current\)setCalls\(v=>v\.some\(x=>x\.id===c\.id\)\?v:\[\.\.\.v,c as Call\]\)\}\)\.on\('postgres_changes',\{event:'UPDATE',schema:'public',table:'call_sessions'\},\(\{new:c\}:any\)=>\{if\(c\.direct_conversation_id===selectedRef\.current\)setCalls\(v=>v\.map\(x=>x\.id===c\.id\?c:x\)\);if\(c\.id===incoming\?\.id&&c\.status!==\'ringing\'\)setIncoming\(null\)\}\)", ".on('postgres_changes',{event:'INSERT',schema:'public',table:'call_sessions'},({new:c}:any)=>{if(c.direct_conversation_id===selectedRef.current)setCalls(v=>v.some(x=>x.id===c.id)?v:[...v,c as Call])}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'call_sessions'},({new:c}:any)=>{if(c.direct_conversation_id===selectedRef.current)setCalls(v=>v.map(x=>x.id===c.id?c:x))})")
$m = [regex]::Replace($m, ";setActiveCall\(\{id:data\.id,callType:type,callerId:user\.id,calleeId:conversation\.other_user_id,remoteName:nameOf\(person\),isIncoming:false,directConversationId:selected\}\)", '')
$m = [regex]::Replace($m, "\[user\?\.id,markRead,incoming\?\.id\]", "[user?.id,markRead]")
$m = [regex]::Replace($m, "\{(?:activeCall|incoming)&&<CallOverlayV2[\s\S]*?/>\}", '')
if ($m -notmatch "table:'profiles'") {
  $needle = ".on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_presence'},({new:p}:any)=>{if(p?.user_id)void loadPeople([p.user_id]);})"
  $m = $m.Replace($needle, $needle + ".on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},({new:p}:any)=>{if(p?.id&&p.id!==user.id)void loadPeople([p.id]);}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},({new:p}:any)=>{if(p?.id&&p.id!==user.id)void loadPeople([p.id]);})")
}
Set-Content $messagesPath $m -Encoding UTF8

if ((Get-Content $messagesPath -Raw) -match 'CallOverlayV2|activeCall|incoming') { throw 'MessagesV6 still contains page-local call overlay state.' }
if ((Get-Content $portalPath -Raw) -notmatch 'GlobalCallManager') { throw 'PortalLayout was not updated with GlobalCallManager.' }

Write-Host ''
Write-Host 'Avelixa communication fix applied locally.' -ForegroundColor Green
Write-Host 'Global calls, presence, live profile/avatar updates, and the Messages badge are now centralized.'
Write-Host ''
Write-Host 'Run: npm run build' -ForegroundColor Cyan
