import { reactive } from 'vue';
import { Peer } from 'peerjs';
import type { MediaConnection } from 'peerjs';

interface CallState {
  isActive: boolean;
  isReceiving: boolean;
  isCalling: boolean;
  callerName: string;
  callerId: number | null;
  groupId: number | null;
  isGroup: boolean;
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
  localStream: null,
  remoteStreams: new Map(),
  memberIds: []
});

let peer: Peer | null = null;
let socket: any = null;
let currentUserId: number | null = null;
const activeConnections = new Map<string, MediaConnection>();

export const initPeerService = (userId: number, socketInstance: any) => {
  currentUserId = userId;
  socket = socketInstance;

  // Wait for a small delay to ensure backend peer server is ready? Nah, should be fine.
  peer = new Peer(userId.toString(), {
    host: window.location.hostname,
    port: 3000,
    path: '/api/peer'
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
        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
          callState.localStream = stream;
          call.answer(stream);
        });
      }
      
      call.on('stream', (remoteStream: MediaStream) => {
        callState.remoteStreams.set(call.peer, remoteStream);
      });
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
  });

  socket.on('call-answered', (data: any) => {
    if (callState.isCalling) {
      callState.isCalling = false;
      callState.isActive = true;
      // Start PeerJS call
      if (callState.localStream && peer) {
        const call = peer.call(data.peerId, callState.localStream);
        call.on('stream', (remoteStream: MediaStream) => {
          callState.remoteStreams.set(data.peerId, remoteStream);
        });
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
    (window as any).groupCallerPeerId = data.peerId; 
  });

  socket.on('group-call-joined', (data: any) => {
    // Someone joined our group call, we should call them
    if (callState.isActive && callState.isGroup && data.groupId === callState.groupId) {
      if (callState.localStream && peer) {
        const call = peer.call(data.peerId, callState.localStream);
        call.on('stream', (remoteStream: MediaStream) => {
          callState.remoteStreams.set(data.peerId, remoteStream);
        });
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
    }
  });
};

export const startCall = async (receiverId: number) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    callState.localStream = stream;
    callState.isCalling = true;
    callState.callerName = 'Calling...'; 
    callState.isGroup = false;

    socket.emit('call-user', { receiverId, peerId: currentUserId?.toString() });
  } catch (err) {
    console.error('Error accessing microphone', err);
    alert('Microphone access denied or not available.');
  }
};

export const startGroupCall = async (groupId: number) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    callState.localStream = stream;
    callState.isActive = true; // immediately active for the starter
    callState.isGroup = true;
    callState.groupId = groupId;

    socket.emit('start-group-call', { groupId, peerId: currentUserId?.toString() });
  } catch (err) {
    console.error('Error accessing microphone', err);
    alert('Microphone access denied or not available.');
  }
};

export const answerCall = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    callState.localStream = stream;
    callState.isReceiving = false;
    callState.isActive = true;

    if (callState.isGroup) {
      socket.emit('join-group-call', { 
        groupId: callState.groupId, 
        peerId: currentUserId?.toString(), 
        memberIds: callState.memberIds 
      });
      // Call the starter
      if ((window as any).groupCallerPeerId && peer) {
        const call = peer.call((window as any).groupCallerPeerId, stream);
        call.on('stream', (remoteStream: MediaStream) => {
          callState.remoteStreams.set((window as any).groupCallerPeerId, remoteStream);
        });
        activeConnections.set((window as any).groupCallerPeerId, call);
      }
    } else {
      socket.emit('call-answered', { callerId: callState.callerId, peerId: currentUserId?.toString() });
      const pendingCall = (window as any).pendingCall;
      if (pendingCall) {
        pendingCall.answer(stream);
        pendingCall.on('stream', (remoteStream: MediaStream) => {
          callState.remoteStreams.set(pendingCall.peer, remoteStream);
        });
        activeConnections.set(pendingCall.peer, pendingCall);
        (window as any).pendingCall = null;
      }
    }
  } catch (err) {
    console.error('Error accessing microphone', err);
    rejectCall(); // fallback
  }
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
    socket.emit('end-call', { 
      receiverId: callState.callerId
    });
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

  if (callState.localStream) {
    callState.localStream.getTracks().forEach(track => track.stop());
    callState.localStream = null;
  }
  
  callState.remoteStreams.clear();
  activeConnections.clear();
  (window as any).pendingCall = null;
  (window as any).groupCallerPeerId = null;
}
