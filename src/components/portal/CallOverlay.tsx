import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, Mic, MicOff, Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AvelixaCallType,
  closePeerConnection,
  createLocalMediaStream,
  createPeerConnection,
  SignalCandidate,
  SignalDescription,
  stopMediaStream,
} from '../../lib/webrtc';

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

interface CallOverlayProps {
  call: ActiveCall;
  onClose: () => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'The call could not be started.';
}

export default function CallOverlay({
  call,
  onClose,
}: CallOverlayProps) {
  const [status, setStatus] = useState<
    'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'
  >(call.isIncoming ? 'ringing' : 'connecting');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(
    call.callType === 'video',
  );
  const [speakerEnabled, setSpeakerEnabled] = useState(true);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSetRef = useRef(false);
  const startedMediaRef = useRef(false);
  const endedRef = useRef(false);

  const isCaller = !call.isIncoming;

  const sendSignal = async (payload: SignalPayload) => {
    const channel = channelRef.current;
    if (!channel) return;

    await channel.send({
      type: 'broadcast',
      event: 'signal',
      payload,
    });
  };

  const flushPendingCandidates = async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection || !remoteDescriptionSetRef.current) return;

    const pending = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of pending) {
      try {
        await peerConnection.addIceCandidate(candidate);
      } catch (candidateError) {
        console.warn('Avelixa could not add a queued ICE candidate:', candidateError);
      }
    }
  };

  const updateCallStatus = async (
    nextStatus: 'accepted' | 'declined' | 'ended' | 'failed',
  ) => {
    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: nextStatus,
    };

    if (nextStatus === 'accepted') {
      update.answered_at = now;
      update.started_at = now;
    }

    if (nextStatus === 'ended' || nextStatus === 'failed') {
      update.ended_at = now;
    }

    const { data: existing } = await supabase
      .from('call_sessions')
      .select('started_at')
      .eq('id', call.id)
      .maybeSingle();

    if (
      existing?.started_at &&
      (nextStatus === 'ended' || nextStatus === 'failed')
    ) {
      const duration = Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(existing.started_at).getTime()) / 1000,
        ),
      );
      update.duration_seconds = duration;
    }

    const { error: updateError } = await supabase
      .from('call_sessions')
      .update(update)
      .eq('id', call.id);

    if (updateError) {
      console.warn('Avelixa call status update failed:', updateError);
    }
  };

  const cleanup = () => {
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    closePeerConnection(peerConnectionRef.current);
    peerConnectionRef.current = null;

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const endCall = async (
    nextStatus: 'ended' | 'failed' = 'ended',
  ) => {
    if (endedRef.current) return;
    endedRef.current = true;

    await updateCallStatus(nextStatus);
    await sendSignal({ kind: 'hangup' });
    setStatus(nextStatus);
    cleanup();

    window.setTimeout(() => {
      onClose();
    }, 350);
  };

  const acceptCall = async () => {
    setError(null);
    setStatus('connecting');

    const { error: updateError } = await supabase
      .from('call_sessions')
      .update({
        status: 'accepted',
        answered_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq('id', call.id)
      .eq('status', 'ringing');

    if (updateError) {
      setStatus('failed');
      setError(getErrorMessage(updateError));
      return;
    }

    await sendSignal({ kind: 'accepted' });
  };

  const declineCall = async () => {
    await updateCallStatus('declined');
    await sendSignal({ kind: 'declined' });
    cleanup();
    onClose();
  };

  const startPeer = async () => {
    if (startedMediaRef.current) return;
    startedMediaRef.current = true;

    try {
      const localStream = await createLocalMediaStream(call.callType);
      localStreamRef.current = localStream;

      if (localVideoRef.current && call.callType === 'video') {
        localVideoRef.current.srcObject = localStream;
      }

      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;

        if (call.callType === 'video') {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        } else if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = !speakerEnabled;
          void remoteAudioRef.current.play().catch(() => undefined);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          void sendSignal({
            kind: 'ice',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const connectionState = peerConnection.connectionState;

        if (connectionState === 'connected') {
          setStatus('connected');
        }

        if (
          connectionState === 'failed' ||
          connectionState === 'closed'
        ) {
          void endCall('failed');
        }
      };

      if (isCaller) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        if (peerConnection.localDescription) {
          await sendSignal({
            kind: 'offer',
            description: peerConnection.localDescription,
          });
        }
      }
    } catch (mediaError) {
      setStatus('failed');
      setError(getErrorMessage(mediaError));
      await updateCallStatus('failed');
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeChannel() {
      await supabase.realtime.setAuth();

      const channel = supabase.channel(`call:${call.id}`, {
        config: {
          private: true,
          broadcast: { ack: true },
        },
      });

      channelRef.current = channel;

      channel.on(
        'broadcast',
        { event: 'signal' },
        async ({ payload }) => {
          if (!mounted || endedRef.current) return;

          const signal = payload as SignalPayload;
          const peerConnection = peerConnectionRef.current;

          if (signal.kind === 'accepted' && isCaller) {
            await startPeer();
            return;
          }

          if (signal.kind === 'declined') {
            endedRef.current = true;
            setStatus('ended');
            cleanup();
            window.setTimeout(onClose, 350);
            return;
          }

          if (signal.kind === 'hangup') {
            endedRef.current = true;
            setStatus('ended');
            cleanup();
            window.setTimeout(onClose, 350);
            return;
          }

          if (!peerConnection) {
            if (signal.kind === 'offer') {
              setError('The call connection was not ready. Please try again.');
              setStatus('failed');
            }
            return;
          }

          if (signal.kind === 'offer') {
            try {
              await peerConnection.setRemoteDescription(signal.description);
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();

              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);

              if (peerConnection.localDescription) {
                await sendSignal({
                  kind: 'answer',
                  description: peerConnection.localDescription,
                });
              }
            } catch (offerError) {
              setError(getErrorMessage(offerError));
              setStatus('failed');
            }
            return;
          }

          if (signal.kind === 'answer') {
            try {
              await peerConnection.setRemoteDescription(signal.description);
              remoteDescriptionSetRef.current = true;
              await flushPendingCandidates();
            } catch (answerError) {
              setError(getErrorMessage(answerError));
              setStatus('failed');
            }
            return;
          }

          if (signal.kind === 'ice') {
            if (!remoteDescriptionSetRef.current) {
              pendingCandidatesRef.current.push(signal.candidate);
              return;
            }

            try {
              await peerConnection.addIceCandidate(signal.candidate);
            } catch (candidateError) {
              console.warn('Avelixa could not add ICE candidate:', candidateError);
            }
          }
        },
      );

      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reject(new Error('Avelixa could not connect the call signaling channel.'));
        });
      });

      if (call.isIncoming) {
        return;
      }

      await startPeer();
    }

    void initializeChannel().catch((channelError) => {
      if (!mounted) return;
      setStatus('failed');
      setError(getErrorMessage(channelError));
    });

    return () => {
      mounted = false;
      cleanup();
    };
    // Call identity is intentionally immutable while the overlay is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setMuted(!track.enabled);
    });
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream || call.callType !== 'video') return;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setCameraEnabled(track.enabled);
    });
  };

  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !next;
    }
  };

  const isVideo = call.callType === 'video';

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-accent-400">
              {isVideo ? 'Video call' : 'Voice call'}
            </div>
            <div className="mt-1 text-lg font-semibold text-white">
              {call.remoteName}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {status === 'ringing' && 'Incoming call'}
              {status === 'connecting' && 'Connecting…'}
              {status === 'connected' && 'Connected'}
              {status === 'ended' && 'Call ended'}
              {status === 'failed' && 'Connection failed'}
            </div>
          </div>
          <div className="rounded-full border border-accent-500/20 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-300">
            Avelixa
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="relative min-h-[420px] bg-black">
          {isVideo ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-[420px] w-full object-cover"
              />
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-4 right-4 h-32 w-24 rounded-2xl border border-white/20 bg-ink-950 object-cover shadow-xl sm:h-40 sm:w-28"
              />
            </>
          ) : (
            <div className="flex h-[420px] flex-col items-center justify-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-accent-500/20 bg-accent-500/10">
                <Volume2 className="h-10 w-10 text-accent-400" />
              </div>
              <div className="text-sm text-gray-400">
                {status === 'connected'
                  ? 'Voice call in progress'
                  : 'Preparing secure voice connection'}
              </div>
              <audio ref={remoteAudioRef} autoPlay />
            </div>
          )}

          {status === 'ringing' && call.isIncoming && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-500/15 border border-accent-500/30">
                  {isVideo ? (
                    <Video className="h-9 w-9 text-accent-300" />
                  ) : (
                    <Phone className="h-9 w-9 text-accent-300" />
                  )}
                </div>
                <div className="mt-5 text-white font-semibold">{call.remoteName} is calling</div>
                <div className="mt-2 text-sm text-gray-400">Answer to start the {isVideo ? 'video' : 'voice'} call.</div>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void declineCall()}
                    className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/25"
                  >
                    <PhoneOff className="h-5 w-5" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => void acceptCall()}
                    className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-400"
                  >
                    <Phone className="h-5 w-5" />
                    Accept
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === 'connecting' && !call.isIncoming && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="rounded-2xl border border-white/10 bg-ink-950/90 px-5 py-4 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-400" />
                <div className="mt-3 text-sm font-medium text-white">Calling {call.remoteName}</div>
                <div className="mt-1 text-xs text-gray-500">Waiting for the other person to answer…</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-5">
          <button
            type="button"
            onClick={toggleMute}
            disabled={!localStreamRef.current}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${muted ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'} disabled:opacity-40`}
            aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {isVideo && (
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!localStreamRef.current}
              className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${!cameraEnabled ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'} disabled:opacity-40`}
              aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            >
              {cameraEnabled ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </button>
          )}

          <button
            type="button"
            onClick={toggleSpeaker}
            disabled={isVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${!speakerEnabled ? 'border-red-500/30 bg-red-500/15 text-red-300' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'} disabled:opacity-40`}
            aria-label={speakerEnabled ? 'Mute speaker' : 'Enable speaker'}
          >
            <Volume2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => void endCall()}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-400"
            aria-label="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
