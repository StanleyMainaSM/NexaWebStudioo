$ErrorActionPreference='Stop'
Set-Location 'C:\Users\user\OneDrive\Desktop\untitled'

$messagesPath='src\pages\portal\CommunicationCenterV4.tsx'
$portalPath='src\pages\portal\PortalLayout.tsx'
$callPath='src\components\portal\CallOverlayV2.tsx'
$globalPath='src\components\portal\GlobalCallManager.tsx'

foreach($p in @($messagesPath,$portalPath,$callPath,$globalPath)) { if(-not(Test-Path $p)){throw "Missing file: $p"} Copy-Item $p "$p.before-communication-v2-fix.bak" -Force }

$raw='https://raw.githubusercontent.com/StanleyMainaSM/NexaWebStudioo/avelixa-local-debug/src/components/portal/GlobalCallManager.tsx'
Invoke-WebRequest -UseBasicParsing $raw -OutFile $globalPath

# Portal: global call manager + correct unread badge.
$p=Get-Content $portalPath -Raw
if($p -notmatch "GlobalCallManager from"){
  $p=$p -replace "import \{ usePortalRealtimeRefresh \} from '../../lib/usePortalRealtime';", "import { usePortalRealtimeRefresh } from '../../lib/usePortalRealtime';`r`nimport GlobalCallManager from '../../components/portal/GlobalCallManager';"
}
$p=$p -replace "supabase\.from\('notifications'\)\.select\('id', \{ count: 'exact', head: true \}\)\.eq\('user_id', user\.id\)\.eq\('is_read', false\)\.in\('notification_type', \['message', 'call'\]\)", "supabase.from('direct_messages').select('id', { count: 'exact', head: true }).neq('sender_id', user.id).is('read_at', null)"
$p=$p -replace "\.on\('postgres_changes', \{ event: '\*', schema: 'public', table: 'notifications', filter: `user_id=eq\.\$\{user\.id\}` \}, \(\) => void refresh\(\)\)", ".on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => void refresh())"
if($p -notmatch '<GlobalCallManager />'){
  $p=$p -replace '<main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">','<GlobalCallManager />`r`n<main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">'
}
Set-Content $portalPath $p -Encoding UTF8

# Communication center: keep messages only; calls are owned by GlobalCallManager.
$m=Get-Content $messagesPath -Raw
$m=$m -replace ', lazy, Suspense',''
$m=[regex]::Replace($m,"import type \{ ActiveCall \} from '../../components/portal/CallOverlayV2';\r?\nconst CallOverlay=lazy\(\(\)=>import\('../../components/portal/CallOverlayV2'\)\);\r?\n",'')
$m=[regex]::Replace($m,",\[activeCall,setActiveCall\]=useState<ActiveCall\|null>\(null\),\[incoming,setIncoming\]=useState<CallEvent\|null\>\(null\)",'')
$m=[regex]::Replace($m,"useEffect\(\(\)=>\{if\(!user\)return;let alive=true;\(async\(\)=>\{try\{await supabase\.rpc\('communication_set_presence',\{p_online:true\}\);await Promise\.all\(\[loadConvos\(\),refreshContacts\(\)\]\)\}catch\(e\)\{if\(alive\)setError\(er\(e\)\)\}finally\{if\(alive\)setLoading\(false\)\}\}\)\(\);const heartbeat=window\.setInterval\(\(\)=>void supabase\.rpc\('communication_set_presence',\{p_online:true\}\),25000\);const off=\(\)=>\{void supabase\.rpc\('communication_set_presence',\{p_online:false\}\)\};window\.addEventListener\('beforeunload',off\);return\(\)=>\{alive=false;window\.clearInterval\(heartbeat\);window\.removeEventListener\('beforeunload',off\);off\(\)\}\},\[user\?\.id,management\]\);","useEffect(()=>{if(!user)return;let alive=true;(async()=>{try{await Promise.all([loadConvos(),refreshContacts()])}catch(e){if(alive)setError(er(e))}finally{if(alive)setLoading(false)}})();return()=>{alive=false}},[user?.id,management]);")
$m=$m -replace "if\(c\.callee_id===user\.id&&c\.status==='ringing'\)setIncoming\(\{\.\.\.c,conversation_id:cid\}\);",''
$m=$m -replace "if\(incoming\?\.id===c\.id&&c\.status!=='ringing'\)setIncoming\(null\);",''
$m=$m -replace "\.on\('postgres_changes',\{event:'UPDATE',schema:'public',table:'user_presence'\},\(\{new:p\}:any\)=>setContacts\(v=>v\.map\(x=>x\.user_id===p\.user_id\?\{\.\.\.x,is_online:!!p\.is_online,last_seen_at:p\.last_seen_at\|\|null\}:x\)\)", ".on('postgres_changes',{event:'UPDATE',schema:'public',table:'user_presence'},({new:p}:any)=>{if(p?.user_id)void refreshContacts();}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},({new:p}:any)=>{if(p?.id)void refreshContacts();}).on('postgres_changes',{event:'INSERT',schema:'public',table:'profiles'},({new:p}:any)=>{if(p?.id)void refreshContacts();})"
$m=$m -replace "\},\[user\?\.id,selectedId,incoming\?\.id\]\);", "},[user?.id,selectedId]);"
$m=$m -replace "if\(e\)throw e;setActiveCall\(\{id:data\.id,callType:type,callerId:user\.id,calleeId:selected\.otherUserId,remoteName:displaySelected,isIncoming:false,directConversationId:selected\.kind==='direct'\?selected\.id:null,adminConversationId:selected\.kind==='admin'\?selected\.id:null\}\)", "if(e)throw e;"
$m=[regex]::Replace($m,"\{incoming&&<Suspense[\s\S]*?\{activeCall&&<Suspense[\s\S]*?/>\}\}","")
Set-Content $messagesPath $m -Encoding UTF8

# Call overlay: deterministic polling + serialized peer startup + retry-safe signal processing.
$c=Get-Content $callPath -Raw
$c=$c -replace "const localStream = useRef<MediaStream \| null>\(null\); const peer = useRef<RTCPeerConnection \| null>\(null\);", "const localStream = useRef<MediaStream | null>(null); const peer = useRef<RTCPeerConnection | null>(null); const peerStartPromise = useRef<Promise<RTCPeerConnection | null> | null>(null);"
$startPattern="const startPeer = async \(createOffer = false\) => \{[\s\S]*?\n  \};\n  const createOfferIfNeeded"
$startReplacement=@'
const startPeer = async (createOffer = false): Promise<RTCPeerConnection | null> => {
    if (peer.current) {
      if (createOffer && !offerCreated.current) await createOfferIfNeeded();
      return peer.current;
    }
    if (peerStartPromise.current) {
      await peerStartPromise.current;
      if (createOffer && peer.current && !offerCreated.current) await createOfferIfNeeded();
      return peer.current;
    }
    peerStartPromise.current = (async () => {
      try {
        const stream = await createLocalMediaStream(call.callType);
        localStream.current = stream;
        if (isVideo && localVideo.current) localVideo.current.srcObject = stream;
        const connection = createPeerConnection();
        peer.current = connection;
        stream.getTracks().forEach(track => connection.addTrack(track, stream));
        connection.ontrack = event => {
          const remoteStream = event.streams[0];
          if (!remoteStream) return;
          if (isVideo && remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
          if (!isVideo && remoteAudio.current) {
            remoteAudio.current.srcObject = remoteStream;
            remoteAudio.current.muted = !speakerEnabled;
            void remoteAudio.current.play().catch(() => undefined);
          }
        };
        connection.onicecandidate = event => {
          if (event.candidate) void sendSignal({kind:'ice',candidate:event.candidate.toJSON()}).catch(e => console.warn('Avelixa ICE signaling failed:', e));
        };
        connection.onconnectionstatechange = () => {
          if (connection.connectionState === 'connected') setStatus('connected');
          if (connection.connectionState === 'failed') {
            setError('The secure voice connection failed.');
            void finish('failed');
          }
        };
        connection.oniceconnectionstatechange = () => {
          if (connection.iceConnectionState === 'connected' || connection.iceConnectionState === 'completed') setStatus('connected');
          if (connection.iceConnectionState === 'failed') setError('The secure network connection could not be established.');
        };
        mediaStarted.current = true;
        return connection;
      } catch (e) {
        mediaStarted.current = false;
        setStatus('failed');
        setError(getErrorMessage(e));
        try { await updateStatus('failed'); } catch { /* preserve media error */ }
        return null;
      }
    })();
    try { await peerStartPromise.current; } finally { peerStartPromise.current = null; }
    if (createOffer && peer.current && !offerCreated.current) await createOfferIfNeeded();
    return peer.current;
  };
  const createOfferIfNeeded
'@
$c=[regex]::Replace($c,$startPattern,$startReplacement)
$processPattern="const processSignal = async \(signal: StoredSignal\) => \{[\s\S]*?\n    \};\n    const pollSignals"
$processReplacement=@'
const processSignal = async (signal: StoredSignal) => {
      if (!alive || ended.current || processedSignals.current.has(signal.id)) return;
      try {
        if (signal.payload.kind === 'ice') {
          if (!remoteReady.current) {
            queuedIce.current.push(signal.payload.candidate);
            processedSignals.current.add(signal.id);
          } else if (peer.current) {
            await peer.current.addIceCandidate(signal.payload.candidate);
            processedSignals.current.add(signal.id);
          }
          return;
        }
        if (signal.payload.kind === 'offer') {
          const connection = await startPeer(false);
          if (!connection || ended.current) return;
          if (connection.signalingState !== 'stable') return;
          await connection.setRemoteDescription(signal.payload.description);
          remoteReady.current = true;
          await flushIce();
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          if (!connection.localDescription) throw new Error('The secure call answer could not be created.');
          await sendSignal({kind:'answer',description:connection.localDescription});
          processedSignals.current.add(signal.id);
          setStatus('connecting');
          return;
        }
        if (signal.payload.kind === 'answer') {
          if (!peer.current || peer.current.signalingState !== 'have-local-offer') return;
          await peer.current.setRemoteDescription(signal.payload.description);
          remoteReady.current = true;
          await flushIce();
          processedSignals.current.add(signal.id);
          return;
        }
      } catch (e) {
        console.error('Avelixa WebRTC signaling error:', e);
        setStatus('failed');
        setError(getErrorMessage(e));
        try { await updateStatus('failed'); } catch { /* preserve original error */ }
      }
    };
    const pollSignals
'@
$c=[regex]::Replace($c,$processPattern,$processReplacement)
$c=$c -replace "pollTimer = window\.setInterval\(\(\) => void pollSignals\(\), 350\);", "pollTimer = window.setInterval(() => void pollSignals(), 250);"
$c=$c -replace "callStatusTimer = window\.setInterval\(\(\) => void pollCallStatus\(\), 700\);", "callStatusTimer = window.setInterval(() => void pollCallStatus(), 500);"
Set-Content $callPath $c -Encoding UTF8

# Hard assertions: fail instead of claiming a partial fix.
$m2=Get-Content $messagesPath -Raw
$p2=Get-Content $portalPath -Raw
$c2=Get-Content $callPath -Raw
if($m2 -match 'CallOverlay|activeCall|incoming') { throw 'CommunicationCenterV4 still contains page-local call overlay state.' }
if($m2 -match 'communication_set_presence') { throw 'CommunicationCenterV4 still owns presence state.' }
if($p2 -notmatch 'GlobalCallManager') { throw 'PortalLayout does not mount GlobalCallManager.' }
if($p2 -notmatch "from\('direct_messages'\).*read_at") { throw 'Messages badge is not based on unread direct_messages.' }
if($c2 -notmatch 'peerStartPromise') { throw 'CallOverlay peer startup serialization was not applied.' }
if($c2 -notmatch 'have-local-offer') { throw 'Answer-state guard was not applied.' }
if($c2 -notmatch 'oniceconnectionstatechange') { throw 'ICE state handling was not applied.' }

Write-Host ''
Write-Host 'Avelixa communication V2 fix applied locally.' -ForegroundColor Green
Write-Host 'Global calls, global presence, live profile/avatar refresh, and the correct unread badge are centralized.'
Write-Host ''
Write-Host 'Run: npm run typecheck' -ForegroundColor Cyan
Write-Host 'Then: npm run build' -ForegroundColor Cyan
