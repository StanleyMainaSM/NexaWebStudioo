import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, Mic, MicOff, Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AvelixaCallType, closePeerConnection, createLocalMediaStream, createPeerConnection, SignalCandidate, SignalDescription, stopMediaStream } from '../../lib/webrtc';

export interface ActiveCall {
  id: string;
  callType: AvelixaCallType;
  callerId: string;
  calleeId: string;
  remoteName: string;
  isIncoming: boolean;
  directConversationId?: string | null;
  adminConversationId?: string | null;
}

type SignalPayload =
  | { kind: 'accepted' }
  | { kind: 'declined' }
  | { kind: 'hangup' }
  | { kind: 'offer'; description: SignalDescription }
  | { kind: 'answer'; description: SignalDescription }
  | { kind: 'ice'; candidate: SignalCandidate };

type CallStatus = 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as { message?: string; reason?: string; status?: string };
    return [value.message, value.reason, value.status].filter(Boolean).join(' • ') || 'The call could not be connected.';
  }
  return 'The call could not be connected.';
}

export default function CallOverlayV2({ call, onClose }: { call: ActiveCall; onClose: () => void }) {
  const isVideo = call.callType === 'video';
  const isCaller = !call.isIncoming;
  const [status, setStatus] = useState<CallStatus>(call.isIncoming ? 'ringing' : 'connecting');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(isVideo);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const localStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const queuedIce = useRef<RTCIceCandidateInit[]>([]);
  const remoteReady = useRef(false);
  const mediaStarted = useRef(false);
  const ended = useRef(false);
  const mounted = useRef(true);

  const send = async (payload: SignalPayload) => {
    const active = channel.current;
    if (!active) throw new Error('The Avelixa call signaling channel is not ready.');
    const result = await active.send({ type: 'broadcast', event: 'signal', payload });
    if (result !== 'ok') throw new Error(`Avelixa signaling message failed: ${String(result)}`);
  };

  const updateStatus = async (next: 'accepted' | 'declined' | 'ended' | 'failed') => {
    const patch: Record<string, unknown> = { status: next };
    const now = new Date().toISOString();
    if (next === 'accepted') {
      patch.started_at = now;
      patch.answered_at = now;
    }
    if (next === 'ended' || next === 'failed') patch.ended_at = now;
    const { data } = await supabase.from('call_sessions').select('started_at').eq('id', call.id).maybeSingle();
    if (data?.started_at && (next === 'ended' || next === 'failed')) {
      patch.duration_seconds = Math.max(0, Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000));
    }
    await supabase.from('call_sessions').update(patch).eq('id', call.id);
  };

  const cleanup = () => {
    stopMediaStream(localStream.current);
    localStream.current = null;
    closePeerConnection(peer.current);
    peer.current = null;
    if (channel.current) {
      void supabase.removeChannel(channel.current);
      channel.current = null;
    }
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
  };

  const finish = async (next: 'ended' | 'failed' = 'ended') => {
    if (ended.current) return;
    ended.current = true;
    try { await send({ kind: 'hangup' }); } catch (e) { console.warn('Avelixa hangup signaling failed:', e); }
    await updateStatus(next);
    if (mounted.current) setStatus(next);
    cleanup();
    window.setTimeout(onClose, 250);
  };

  const flushIce = async () => {
    if (!peer.current || !remoteReady.current) return;
    const candidates = queuedIce.current.splice(0);
    for (const candidate of candidates) {
      try { await peer.current.addIceCandidate(candidate); } catch (e) { console.warn('Avelixa ICE error:', e); }
    }
  };

  const startPeer = async () => {
    if (mediaStarted.current) return;
    mediaStarted.current = true;
    try {
      const stream = await createLocalMediaStream(call.callType);
      localStream.current = stream;
      if (isVideo && localVideo.current) localVideo.current.srcObject = stream;
      const connection = createPeerConnection();
      peer.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        if (isVideo && remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
        if (!isVideo && remoteAudio.current) {
          remoteAudio.current.srcObject = remoteStream;
          remoteAudio.current.muted = !speakerEnabled;
          void remoteAudio.current.play().catch(() => undefined);
        }
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) void send({ kind: 'ice', candidate: event.candidate.toJSON() }).catch((e) => console.warn('Avelixa ICE signaling failed:', e));
      };
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') setStatus('connected');
        if (connection.connectionState === 'failed') void finish('failed');
      };
      if (isCaller) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        if (connection.localDescription) await send({ kind: 'offer', description: connection.localDescription });
      }
    } catch (e) {
      setStatus('failed');
      setError(getErrorMessage(e));
      await updateStatus('failed');
    }
  };

  const accept = async () => {
    setError(null);
    setStatus('connecting');
    const { error: updateError } = await supabase.from('call_sessions').update({ status: 'accepted', started_at: new Date().toISOString(), answered_at: new Date().toISOString() }).eq('id', call.id).eq('status', 'ringing');
    if (updateError) { setStatus('failed'); setError(getErrorMessage(updateError)); return; }
    try { await send({ kind: 'accepted' }); } catch (e) { setStatus('failed'); setError(getErrorMessage(e)); await updateStatus('failed'); return; }
    await startPeer();
  };

  const decline = async () => {
    await updateStatus('declined');
    try { await send({ kind: 'declined' }); } catch (e) { console.warn('Avelixa decline signaling failed:', e); }
    ended.current = true;
    cleanup();
    onClose();
  };

  useEffect(() => {
    mounted.current = true;
    let alive = true;

    const subscribe = () => new Promise<void>((resolve, reject) => {
      const room = supabase.channel(`call:${call.id}`, { config: { broadcast: { ack: true } } });
      channel.current = room;
      room.on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!alive || ended.current) return;
        const signal = payload as SignalPayload;
        if (signal.kind === 'accepted' && isCaller) { await startPeer(); return; }
        if (signal.kind === 'declined' || signal.kind === 'hangup') {
          ended.current = true;
          setStatus('ended');
          cleanup();
          window.setTimeout(onClose, 250);
          return;
        }
        if (signal.kind === 'offer') {
          if (!peer.current) await startPeer();
          if (!peer.current) return;
          try {
            await peer.current.setRemoteDescription(signal.description);
            remoteReady.current = true;
            await flushIce();
            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);
            if (peer.current.localDescription) await send({ kind: 'answer', description: peer.current.localDescription });
          } catch (e) { setStatus('failed'); setError(getErrorMessage(e)); }
          return;
        }
        if (signal.kind === 'answer') {
          if (!peer.current) return;
          try { await peer.current.setRemoteDescription(signal.description); remoteReady.current = true; await flushIce(); } catch (e) { setStatus('failed'); setError(getErrorMessage(e)); }
          return;
        }
        if (signal.kind === 'ice') {
          if (!remoteReady.current) queuedIce.current.push(signal.candidate);
          else if (peer.current) { try { await peer.current.addIceCandidate(signal.candidate); } catch (e) { console.warn('Avelixa ICE error:', e); } }
        }
      });
      room.subscribe((subscriptionStatus, subscriptionError) => {
        if (subscriptionStatus === 'SUBSCRIBED') { resolve(); return; }
        const detail = subscriptionError ? getErrorMessage(subscriptionError) : subscriptionStatus;
        reject(new Error(`Avelixa could not connect the call signaling channel${detail ? ` (${detail})` : '.'}`));
      });
    });

    const initialize = async () => {
      try {
        await subscribe();
        if (!alive) return;
        if (!call.isIncoming) await startPeer();
      } catch (e) {
        if (!alive) return;
        setStatus('failed');
        setError(getErrorMessage(e));
        // Never cancel a ringing invitation merely because signaling failed.
        // The recipient is discovered from call_sessions polling.
        if (isCaller) await updateStatus('ringing');
      }
    };

    void initialize();
    return () => { alive = false; mounted.current = false; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  const toggleMute = () => {
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = !track.enabled; setMuted(!track.enabled); });
  };
  const toggleCamera = () => {
    if (!isVideo) return;
    localStream.current?.getVideoTracks().forEach((track) => { track.enabled = !track.enabled; setCameraEnabled(track.enabled); });
  };
  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    if (remoteAudio.current) remoteAudio.current.muted = !next;
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><div className="text-xs uppercase tracking-[0.2em] text-accent-400">{isVideo ? 'Video call' : 'Voice call'}</div><div className="mt-1 text-lg font-semibold text-white">{call.remoteName}</div><div className="mt-1 text-xs text-gray-500">{status === 'ringing' ? 'Incoming call' : status === 'connecting' ? 'Connecting…' : status === 'connected' ? 'Connected' : status === 'failed' ? 'Connection failed' : 'Call ended'}</div></div><div className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-300">Avelixa</div></div>
        {error && <div className="mx-5 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        <div className="relative min-h-[420px] bg-black">
          {isVideo ? <><video ref={remoteVideo} autoPlay playsInline className="h-[420px] w-full object-cover" /><video ref={localVideo} autoPlay muted playsInline className="absolute bottom-4 right-4 h-32 w-24 rounded-2xl border border-white/20 bg-ink-950 object-cover shadow-xl sm:h-40 sm:w-28" /></> : <div className="flex h-[420px] flex-col items-center justify-center gap-4"><div className="flex h-24 w-24 items-center justify-center rounded-full border border-accent-500/20 bg-accent-500/10"><Volume2 className="h-10 w-10 text-accent-400" /></div><div className="text-sm text-gray-400">{status === 'connected' ? 'Voice call in progress' : 'Preparing secure voice connection'}</div><audio ref={remoteAudio} autoPlay /></div>}
          {call.isIncoming && status === 'ringing' && <div className="absolute inset-0 flex items-center justify-center bg-black/55"><div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-accent-500/30 bg-accent-500/15">{isVideo ? <Video className="h-9 w-9 text-accent-300" /> : <Phone className="h-9 w-9 text-accent-300" />}</div><div className="mt-5 font-semibold text-white">{call.remoteName} is calling</div><div className="mt-2 text-sm text-gray-400">Answer to start the {isVideo ? 'video' : 'voice'} call.</div><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={() => void decline()} className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/25"><PhoneOff className="h-5 w-5" />Decline</button><button type="button" onClick={() => void accept()} className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-400"><Phone className="h-5 w-5" />Accept</button></div></div></div>}
          {!call.isIncoming && status === 'connecting' && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><div className="rounded-2xl border border-white/10 bg-ink-950/90 px-5 py-4 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-400" /><div className="mt-3 text-sm font-medium text-white">Calling {call.remoteName}</div><div className="mt-1 text-xs text-gray-500">Waiting for the other person to answer…</div></div></div>}
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-5"><button type="button" onClick={toggleMute} className={`flex h-12 w-12 items-center justify-center rounded-full border ${muted ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>{muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button>{isVideo && <button type="button" onClick={toggleCamera} className={`flex h-12 w-12 items-center justify-center rounded-full border ${!cameraEnabled ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>{cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}</button>}{!isVideo && <button type="button" onClick={toggleSpeaker} className={`flex h-12 w-12 items-center justify-center rounded-full border ${!speakerEnabled ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}><Volume2 className="h-5 w-5" /></button>}<button type="button" onClick={() => void finish()} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-400"><PhoneOff className="h-6 w-6" /></button></div>
      </div>
    </div>
  );
}
