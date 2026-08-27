export type AvelixaCallType = 'voice' | 'video';

export type SignalDescription = RTCSessionDescriptionInit;
export type SignalCandidate = RTCIceCandidateInit;

function getClientEnv(key: string) {
  const env = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  }).env;

  return env?.[key];
}

export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  const turnUrl = getClientEnv('VITE_TURN_URL');
  const turnUsername = getClientEnv('VITE_TURN_USERNAME');
  const turnCredential = getClientEnv('VITE_TURN_CREDENTIAL');

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}

export async function createLocalMediaStream(
  callType: AvelixaCallType,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'Your browser does not support microphone/camera access.',
    );
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === 'video',
  });
}

export function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: getIceServers(),
  });
}

export function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function closePeerConnection(
  peerConnection: RTCPeerConnection | null,
) {
  if (!peerConnection) return;

  peerConnection.onicecandidate = null;
  peerConnection.ontrack = null;
  peerConnection.onconnectionstatechange = null;
  peerConnection.oniceconnectionstatechange = null;
  peerConnection.close();
}
