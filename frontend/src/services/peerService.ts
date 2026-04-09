import { reactive } from 'vue';
import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';

type CallType = 'audio' | 'video';

interface CallState {
  isActive: boolean;
  isReceiving: boolean;
  isCalling: boolean;
  callerName: string;
  callerId: number | null;
  groupId: number | null;
  isGroup: boolean;
  callType: CallType;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>; 
  memberIds: number[]; 
}

export const callState = reactive<CallState>({
  isActive: false,
  isReceiving: false,
  isCalling: false,
  callerName: '',
  callerId: null,
  groupId: null,
  isGroup: false,
  callType: 'audio',
  isMicEnabled: true,
  isCameraEnabled: true,
  localStream: null,
  remoteStreams: new Map(),
  memberIds: []
});

let peer: Peer | null = null;
let socket: any = null;
let currentUserId: number | null = null;
const activeConnections = new Map<string, MediaConnection>();
const GROUP_MESH_LIMIT = 8;

function getMediaConstraints(callType: CallType): MediaStreamConstraints {
  if (callType === 'video') {
    return {
      audio: true,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };
  }
  return { video: false, audio: true };
}

function getInitialTrackStatesFor(callType: CallType) {
  return {
    isMicEnabled: true,
    isCameraEnabled: callType === 'video',
  };
}

function applyTrackStates(stream: MediaStream, states: { isMicEnabled: boolean; isCameraEnabled: boolean }) {
  for (const t of stream.getAudioTracks()) t.enabled = states.isMicEnabled;
  for (const t of stream.getVideoTracks()) t.enabled = states.isCameraEnabled;
}

function attachConnectionHandlers(conn: MediaConnection) {
  conn.on('stream', (remoteStream: MediaStream) => {
    callState.remoteStreams.set(conn.peer, remoteStream);
  });
  conn.on('close', () => {
    callState.remoteStreams.delete(conn.peer);
    activeConnections.delete(conn.peer);
  });
  conn.on('error', () => {
    callState.remoteStreams.delete(conn.peer);
    activeConnections.delete(conn.peer);
  });
}

function parseIceServersFromEnv(): RTCIceServer[] {
  // Prefer a full JSON array if provided.
  const rawJson = (import.meta as any)?.env?.VITE_ICE_SERVERS as string | undefined;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    } catch {
      // ignore
    }
  }

  const servers: RTCIceServer[] = [];

  const stun = ((import.meta as any)?.env?.VITE_STUN_URL as string | undefined)?.trim();
  if (stun) servers.push({ urls: stun });

  const turnUrlsRaw = ((import.meta as any)?.env?.VITE_TURN_URL as string | undefined)?.trim();
  const turnUser = ((import.meta as any)?.env?.VITE_TURN_USER as string | undefined)?.trim();
  const turnCred = ((import.meta as any)?.env?.VITE_TURN_CRED as string | undefined)?.trim();
  if (turnUrlsRaw && turnUser && turnCred) {
    const urls = turnUrlsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (urls.length) servers.push({ urls, username: turnUser, credential: turnCred });
  }

  // Safe fallback (works for many home networks; not guaranteed everywhere).
  if (servers.length === 0) servers.push({ urls: 'stun:stun.l.google.com:19302' });
  return servers;
}

export const initPeerService = (userId: number, socketInstance: any) => {
  currentUserId = userId;
  socket = socketInstance;

  // Wait for a small delay to ensure backend peer server is ready? Nah, should be fine.
  peer = new Peer(userId.toString(), {
    host: window.location.hostname, 
    path: '/api/peer',
    secure: true,        
    port: 443,           
    debug: 3,            
    config: {
      iceServers: parseIceServersFromEnv(),
    },
  });

  peer.on('open', (id: string) => {
    console.log('My peer ID is: ' + id);
  });

  peer.on('call', (call: MediaConnection) => {
    // If we are already in the call (group mesh), auto-answer.
    if (callState.isActive) {
      if (callState.localStream) {
        call.answer(callState.localStream);
      } else {
        const callType = (call as any)?.metadata?.callType as CallType | undefined;
        navigator.mediaDevices.getUserMedia(getMediaConstraints(callType ?? callState.callType)).then(stream => {
          callState.localStream = stream;
          const init = getInitialTrackStatesFor(callType ?? callState.callType);
          callState.isMicEnabled = init.isMicEnabled;
          callState.isCameraEnabled = init.isCameraEnabled;
          applyTrackStates(stream, init);
          call.answer(stream);
        });
      }
      
      attachConnectionHandlers(call);
      activeConnections.set(call.peer, call);
      return;
    }

    // Normal incoming call (we should NOT auto-answer if waitng)
    // Actually, in our signaling, socket event 'incoming-call' shows the UI.
    // The PeerJS 'call' event might happen before or after the user clicks "Answer".
    // If the user hasn't answered yet, we can defer answering.
    
    // For simplicity, we can let Socket handle the ringing. 
    // When user accepts, we call `answerIncoming(call)`
    // We will store the pending call in a temporary variable or just auto-answer with NO stream initially?
    // No, standard way: keep reference to incoming media connection.
    (window as any).pendingCall = call;
  });

  // Socket signaling
  socket.on('incoming-call', (data: any) => {
    if (callState.isActive || callState.isReceiving) return; // Busy
    callState.isReceiving = true;
    callState.callerId = data.callerId;
    callState.callerName = data.callerUsername;
    callState.isGroup = false;
    callState.callType = (data.callType === 'video' ? 'video' : 'audio');
  });

  socket.on('call-answered', (data: any) => {
    if (callState.isCalling) {
      callState.isCalling = false;
      callState.isActive = true;
      // Start PeerJS call
      if (callState.localStream && peer) {
        const call = peer.call(data.peerId, callState.localStream, { metadata: { callType: callState.callType } } as any);
        attachConnectionHandlers(call);
        activeConnections.set(data.peerId, call);
      }
    }
  });

  socket.on('call-rejected', () => {
    if (callState.isCalling) {
      resetCallState();
      alert('Call was rejected');
    }
  });

  socket.on('call-ended', () => {
    resetCallState();
  });

  // Group Signaling
  socket.on('incoming-group-call', (data: any) => {
    if (callState.isActive || callState.isReceiving) return;
    callState.isReceiving = true;
    callState.callerId = data.callerId;
    callState.callerName = data.callerUsername;
    callState.groupId = data.groupId;
    callState.isGroup = true;
    callState.memberIds = data.memberIds;
    callState.callType = (data.callType === 'video' ? 'video' : 'audio');
    (window as any).groupCallerPeerId = data.peerId; 
  });

  socket.on('group-call-joined', (data: any) => {
    // Someone joined our group call, we should call them
    if (callState.isActive && callState.isGroup && data.groupId === callState.groupId) {
      if (callState.localStream && peer) {
        const call = peer.call(data.peerId, callState.localStream, { metadata: { callType: callState.callType } } as any);
        attachConnectionHandlers(call);
        activeConnections.set(data.peerId, call);
      }
    }
  });

  socket.on('group-call-left', (data: any) => {
   if (callState.isActive && callState.groupId === data.groupId) {
    const peerId = data.userId.toString();
    if (activeConnections.has(peerId)) {
      activeConnections.get(peerId)?.close();
      activeConnections.delete(peerId);
    }
    callState.remoteStreams.delete(peerId);

    if (callState.remoteStreams.size === 0) {
      resetCallState();
    }
  } 
  else if (callState.isReceiving && callState.groupId === data.groupId) {
    // Arayan kişi (starter) aramayı iptal ederse modalı kapat
    resetCallState();
  }
  });
};

export const startCall = async (receiverId: number) => {
  callState.callType = 'audio';
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('audio'));
    callState.localStream = stream;
    const init = getInitialTrackStatesFor('audio');
    callState.isMicEnabled = init.isMicEnabled;
    callState.isCameraEnabled = init.isCameraEnabled;
    applyTrackStates(stream, init);
    callState.callerId = receiverId;
    callState.isCalling = true;
    callState.callerName = 'Calling...'; 
    callState.isGroup = false;

    socket.emit('call-user', { receiverId, peerId: currentUserId?.toString(), callType: 'audio' });
  } catch (err) {
    console.error('Error accessing microphone', err);
    alert('Microphone access denied or not available.');
  }
};

export const startVideoCall = async (receiverId: number) => {
  callState.callType = 'video';
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('video'));
    callState.localStream = stream;
    const init = getInitialTrackStatesFor('video');
    callState.isMicEnabled = init.isMicEnabled;
    callState.isCameraEnabled = init.isCameraEnabled;
    applyTrackStates(stream, init);
    callState.callerId = receiverId;
    callState.isCalling = true;
    callState.callerName = 'Calling...';
    callState.isGroup = false;

    socket.emit('call-user', { receiverId, peerId: currentUserId?.toString(), callType: 'video' });
  } catch (err) {
    console.error('Error accessing camera/microphone', err);
    alert('Camera/microphone access denied or not available.');
  }
};

export const startGroupCall = async (groupId: number) => {
  callState.callType = 'audio';
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('audio'));
    callState.localStream = stream;
    const init = getInitialTrackStatesFor('audio');
    callState.isMicEnabled = init.isMicEnabled;
    callState.isCameraEnabled = init.isCameraEnabled;
    applyTrackStates(stream, init);
    callState.isActive = true; // immediately active for the starter
    callState.isGroup = true;
    callState.groupId = groupId;

    socket.emit('start-group-call', { groupId, peerId: currentUserId?.toString(), callType: 'audio' }, (res: any) => {
      if (res?.memberIds && Array.isArray(res.memberIds)) callState.memberIds = res.memberIds;
    });
  } catch (err) {
    console.error('Error accessing microphone', err);
    alert('Microphone access denied or not available.');
  }
};

export const startGroupVideoCall = async (groupId: number) => {
  callState.callType = 'video';
  try {
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints('video'));
    callState.localStream = stream;
    const init = getInitialTrackStatesFor('video');
    callState.isMicEnabled = init.isMicEnabled;
    callState.isCameraEnabled = init.isCameraEnabled;
    applyTrackStates(stream, init);
    callState.isActive = true;
    callState.isGroup = true;
    callState.groupId = groupId;

    socket.emit('start-group-call', { groupId, peerId: currentUserId?.toString(), callType: 'video' }, (res: any) => {
      if (res?.memberIds && Array.isArray(res.memberIds)) callState.memberIds = res.memberIds;
      if (callState.memberIds.length > GROUP_MESH_LIMIT) {
        alert(`Group video calls are limited to ${GROUP_MESH_LIMIT} participants with the current PeerJS mesh setup.`);
        endCall();
      }
    });
  } catch (err) {
    console.error('Error accessing camera/microphone', err);
    alert('Camera/microphone access denied or not available.');
  }
};

export const answerCall = async () => {
  try {
    if (callState.isGroup && callState.callType === 'video' && callState.memberIds.length > GROUP_MESH_LIMIT) {
      alert(`This group video call exceeds the current ${GROUP_MESH_LIMIT}-participant limit.`);
      rejectCall();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints(callState.callType));
    callState.localStream = stream;
    const init = getInitialTrackStatesFor(callState.callType);
    callState.isMicEnabled = init.isMicEnabled;
    callState.isCameraEnabled = init.isCameraEnabled;
    applyTrackStates(stream, init);
    callState.isReceiving = false;
    callState.isActive = true;

    if (callState.isGroup) {
      socket.emit('join-group-call', { 
        groupId: callState.groupId, 
        peerId: currentUserId?.toString(), 
        memberIds: callState.memberIds,
        callType: callState.callType,
      });
      // Call the starter
      if ((window as any).groupCallerPeerId && peer) {
        const call = peer.call((window as any).groupCallerPeerId, stream, { metadata: { callType: callState.callType } } as any);
        attachConnectionHandlers(call);
        activeConnections.set((window as any).groupCallerPeerId, call);
      }
    } else {
      socket.emit('call-answered', { callerId: callState.callerId, peerId: currentUserId?.toString(), callType: callState.callType });
      const pendingCall = (window as any).pendingCall;
      if (pendingCall) {
        pendingCall.answer(stream);
        attachConnectionHandlers(pendingCall);
        activeConnections.set(pendingCall.peer, pendingCall);
        (window as any).pendingCall = null;
      }
    }
  } catch (err) {
    console.error('Error accessing microphone', err);
    rejectCall(); // fallback
  }
};

export const toggleMic = () => {
  if (!callState.localStream) return;
  callState.isMicEnabled = !callState.isMicEnabled;
  for (const t of callState.localStream.getAudioTracks()) t.enabled = callState.isMicEnabled;
};

export const toggleCamera = () => {
  if (!callState.localStream) return;
  callState.isCameraEnabled = !callState.isCameraEnabled;
  for (const t of callState.localStream.getVideoTracks()) t.enabled = callState.isCameraEnabled;
};

export const rejectCall = () => {
  if (callState.isGroup) {
      // Just ignore the group call
  } else {
      socket.emit('call-rejected', { callerId: callState.callerId });
  }
  resetCallState();
};

export const endCall = () => {
  if (callState.isGroup) {
    socket.emit('leave-group-call', { groupId: callState.groupId, memberIds: callState.memberIds });
  } else {
    // End 1-on-1 call
    const targetId = callState.callerId; 
    if (targetId) {
      socket.emit('end-call', { receiverId: targetId });
    }
  }

  // Broadly terminate
  activeConnections.forEach(conn => conn.close());
  resetCallState();
};

function resetCallState() {
  callState.isActive = false;
  callState.isReceiving = false;
  callState.isCalling = false;
  callState.callerName = '';
  callState.callerId = null;
  callState.groupId = null;
  callState.isGroup = false;
  callState.memberIds = [];
  callState.callType = 'audio';
  callState.isMicEnabled = true;
  callState.isCameraEnabled = true;

  if (callState.localStream) {
    callState.localStream.getTracks().forEach(track => track.stop());
    callState.localStream = null;
  }
  
  callState.remoteStreams.clear();
  activeConnections.clear();
  (window as any).pendingCall = null;
  (window as any).groupCallerPeerId = null;
}
