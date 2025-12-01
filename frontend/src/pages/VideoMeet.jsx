import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from 'react';
import io from 'socket.io-client';
import {
  Box,
  Badge,
  IconButton,
  TextField,
  Button,
  Container,
  Typography,
  Card,
  Paper,
  Tooltip,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import server from '../environment';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const theme = createTheme({
  palette: {
    primary: { main: '#667eea' },
    secondary: { main: '#764ba2' },
  },
});

const peerConfigConnections = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // NOTE: for production TURN server is recommended for NAT/firewall issues.
  ],
};

export default function VideoMeet() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { addToUserHistory } = useContext(AuthContext);

  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoRefs = useRef({}); // socketId -> HTMLVideoElement
  const connectionsRef = useRef({}); // socketId -> RTCPeerConnection
  const remoteNamesRef = useRef({}); // socketId -> displayName

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);

  const [askForDisplayName, setAskForDisplayName] = useState(true);
  const [inputName, setInputName] = useState('');
  const [displayName, setDisplayName] = useState('Guest');

  const [showChat, setShowChat] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');

  const [videos, setVideos] = useState([]); // {socketId, stream, displayName}
  const [callStartTime, setCallStartTime] = useState(null);

  const messagesEndRef = useRef(null);

  // preload saved name but still show join screen
  useEffect(() => {
    const saved = localStorage.getItem('userName');
    if (saved) {
      setDisplayName(saved);
      setInputName(saved);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------------------------
  // Device availability check
  // Avoid prompting user multiple times. Use enumerateDevices.
  // ---------------------------
  useEffect(() => {
    const checkDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          setVideoAvailable(false);
          setAudioAvailable(false);
          setScreenAvailable(false);
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');
        setVideoAvailable(hasVideo);
        setAudioAvailable(hasAudio);
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
      } catch (e) {
        console.error('device check error', e);
        setVideoAvailable(false);
        setAudioAvailable(false);
        setScreenAvailable(false);
      }
    };
    checkDevices();
  }, []);

  // Helper: safely set video element for a socketId and configure playback
  const setVideoRef = (socketId, el) => {
    if (el) {
      // configure element for autoplay & inline play (mobile)
      try {
        el.autoplay = true;
        el.playsInline = true;
        el.controls = false;

        // remote streams should NOT be muted; local preview is muted elsewhere
        if (videoRefs.current[socketId] !== el) {
          // if replacing element, try to attach existing stream
          const existing = videos.find(v => v.socketId === socketId);
          if (existing && existing.stream) {
            if (el.srcObject !== existing.stream) {
              el.srcObject = existing.stream;
              // attempt to play (some browsers require user gesture; join button is a gesture)
              el.play().catch(() => {});
            }
          }
        }
      } catch (e) {
        // ignore DOM property errors
      }
      videoRefs.current[socketId] = el;
    } else {
      // removed
      if (videoRefs.current[socketId] && videoRefs.current[socketId].srcObject) {
        try {
          videoRefs.current[socketId].srcObject = null;
        } catch (e) {}
      }
      delete videoRefs.current[socketId];
    }
  };

  // Attach streams to DOM videos whenever "videos" state changes
  useEffect(() => {
    videos.forEach(v => {
      const el = videoRefs.current[v.socketId];
      if (el && v.stream && el.srcObject !== v.stream) {
        el.srcObject = v.stream;
        // explicit play to handle mobile autoplay policies
        el.play().catch(() => {
          // play may fail if browser requires user interaction. Join click should suffice.
        });
      }
    });
  }, [videos]);

  // Add local tracks to a peer connection (if localStream exists)
  const addLocalTracksToPc = (pc) => {
    if (!window.localStream) return;
    const senders = pc.getSenders ? pc.getSenders() : [];
    window.localStream.getTracks().forEach(track => {
      const already = senders.find(s => s.track && s.track.kind === track.kind);
      if (!already) {
        try {
          pc.addTrack(track, window.localStream);
        } catch (e) {
          // ignore
        }
      } else {
        try {
          already.replaceTrack && already.replaceTrack(track);
        } catch (e) {
          // ignore
        }
      }
    });
  };

  // Replace/attach tracks for all existing connections when local stream changes
  const replaceTracksInConnections = (stream) => {
    Object.values(connectionsRef.current).forEach(pc => {
      if (!pc.getSenders) return;
      const senders = pc.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender && sender.replaceTrack) {
          try {
            sender.replaceTrack(track);
          } catch (e) {
            // ignore
          }
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            // ignore
          }
        }
      });
    });
  };

  // ---------------------------
  // getUserMedia — improved constraints & error handling
  // ---------------------------
  const getUserMedia = async (videoEnabled, audioEnabled) => {
    try {
      // stop previous if disabling both
      if (!videoEnabled && !audioEnabled) {
        if (localVideoRef.current?.srcObject) {
          localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
          localVideoRef.current.srcObject = null;
        }
        window.localStream = null;
        return;
      }

      const constraints = {
        video: videoEnabled ? { facingMode: 'user' } : false,
        audio: audioEnabled
          ? { echoCancellation: true, noiseSuppression: true }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // stop any old stream tracks (we will replace)
      if (window.localStream) {
        try {
          window.localStream.getTracks().forEach(t => {
            // avoid stopping if it's the same track object
            if (!stream.getTracks().some(nt => nt.id === t.id)) t.stop();
          });
        } catch (e) {}
      }

      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // local preview must be muted to prevent echo
        try {
          localVideoRef.current.muted = true;
          localVideoRef.current.autoplay = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.play().catch(() => {});
        } catch (e) {}
      }

      replaceTracksInConnections(stream);
    } catch (e) {
      console.error('getUserMedia error', e);

      // handle permission / device busy errors gracefully
      if (e.name === 'NotReadableError' || e.name === 'NotAllowedError') {
        alert('Camera or microphone is busy or blocked. Joining with available devices only.');
        // try audio-only fallback
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          window.localStream = audioStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = audioStream;
            localVideoRef.current.muted = true;
            localVideoRef.current.autoplay = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.play().catch(() => {});
          }
          replaceTracksInConnections(audioStream);
          setVideo(false);
          setAudio(true);
        } catch (err) {
          console.error('Audio only fallback failed', err);
          setVideo(false);
          setAudio(false);
        }
      }
    }
  };

  const getDisplayMedia = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
      });

      // keep audio if user had audio enabled
      const audioTracks = window.localStream ? window.localStream.getAudioTracks() : [];
      if (audioTracks.length) {
        audioTracks.forEach(t => screenStream.addTrack(t));
      }

      // stop previous local tracks
      if (window.localStream) {
        window.localStream.getTracks().forEach(t => t.stop());
      }

      window.localStream = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        try { localVideoRef.current.muted = true; localVideoRef.current.play().catch(()=>{}); } catch(e){}
      }

      replaceTracksInConnections(screenStream);

      screenStream.getTracks().forEach(track => {
        track.onended = () => {
          setScreen(false);
          // restore camera/mic with current states
          getUserMedia(video, audio);
        };
      });
    } catch (e) {
      console.error('displayMedia error', e);
      setScreen(false);
    }
  };

  // Create a peer connection and wire handlers (returns pc)
  const createPeerConnection = (remoteId, remoteName = 'Guest') => {
    if (connectionsRef.current[remoteId]) return connectionsRef.current[remoteId];

    const pc = new RTCPeerConnection(peerConfigConnections);
    connectionsRef.current[remoteId] = pc;
    remoteNamesRef.current[remoteId] = remoteName;

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current?.connected) {
        socketRef.current.emit('signal', remoteId, JSON.stringify({ ice: ev.candidate }), displayName);
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setVideos(prev => {
        const existing = prev.find(v => v.socketId === remoteId);
        const obj = {
          socketId: remoteId,
          stream,
          displayName: remoteNamesRef.current[remoteId] || remoteName || 'Guest',
        };
        if (existing) return prev.map(v => (v.socketId === remoteId ? obj : v));
        return [...prev, obj];
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        try { pc.close(); } catch (e) {}
        delete connectionsRef.current[remoteId];
        setVideos(prev => prev.filter(v => v.socketId !== remoteId));
      }
    };

    // add local tracks if available
    addLocalTracksToPc(pc);

    return pc;
  };

  // SDP / ICE handler
  const handleSignal = useCallback(
    async (fromId, message, senderName) => {
      try {
        if (senderName) remoteNamesRef.current[fromId] = senderName;

        const signal = typeof message === 'string' ? JSON.parse(message) : message;

        let pc = connectionsRef.current[fromId];
        if (!pc) {
          pc = createPeerConnection(fromId, senderName || 'Guest');
        }

        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          await pc.setRemoteDescription(desc);

          if (signal.sdp.type === 'offer') {
            // ensure our local tracks are on this pc before answering
            addLocalTracksToPc(pc);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: pc.localDescription }), displayName);
          }
        }

        if (signal.ice) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
          } catch (err) {
            console.warn('addIceCandidate failed', err);
          }
        }
      } catch (e) {
        console.error('handleSignal', e);
      }
    },
    [displayName]
  );

  // Socket + WebRTC
  const connectToSocketServer = useCallback(() => {
    socketRef.current = io(server, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      // join the room and tell server our displayName
      socketRef.current.emit('join-call', roomId || 'default', displayName);
    });

    socketRef.current.on('signal', (fromId, message, senderName) => {
      handleSignal(fromId, message, senderName);
    });

    // When a new user joins the room, existing participants should create an offer to them
    socketRef.current.on('user-joined', (userId, senderName) => {
      try {
        if (userId === socketIdRef.current) return; // ignore our own event
        if (connectionsRef.current[userId]) return;
        const pc = createPeerConnection(userId, senderName || 'Guest');

        // Ensure local tracks are attached
        addLocalTracksToPc(pc);

        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socketRef.current.emit('signal', userId, JSON.stringify({ sdp: pc.localDescription }), displayName);
          })
          .catch(err => console.error('createOffer error', err));
      } catch (e) {
        console.error('user-joined handler error', e);
      }
    });

    socketRef.current.on('user-left', (userId) => {
      if (connectionsRef.current[userId]) {
        try { connectionsRef.current[userId].close(); } catch (e) {}
        delete connectionsRef.current[userId];
      }
      setVideos(prev => prev.filter(v => v.socketId !== userId));
      delete remoteNamesRef.current[userId];
    });

    socketRef.current.on('chat-message', (data, sender, socketIdSender) => {
      const msg = {
        sender,
        data,
        timestamp: new Date().toLocaleTimeString(),
        socketId: socketIdSender,
        isOwn: socketIdSender === socketIdRef.current,
      };
      setMessages(prev => [...prev, msg]);
      if (socketIdSender !== socketIdRef.current && !showChat) {
        setNewMessages(n => n + 1);
      }
    });

    socketRef.current.on('disconnect', () => {
      // cleanup all peer connections
      Object.values(connectionsRef.current).forEach(pc => pc.close());
      connectionsRef.current = {};
      setVideos([]);
    });
  }, [roomId, displayName, handleSignal, showChat]);

  const sendMessage = useCallback(() => {
    if (!message.trim() || !socketRef.current?.connected) return;
    const msg = {
      sender: displayName,
      data: message,
      timestamp: new Date().toLocaleTimeString(),
      socketId: socketIdRef.current,
      isOwn: true,
    };
    socketRef.current.emit('chat-message', message, displayName, socketIdRef.current);
    setMessages(prev => [...prev, msg]);
    setMessage('');
  }, [message, displayName]);

  const handleConnect = async () => {
    const name = inputName.trim();
    if (!name) {
      alert('Please enter your display name');
      return;
    }
    setDisplayName(name);
    localStorage.setItem('userName', name);
    setAskForDisplayName(false);
    setCallStartTime(new Date());

    // get both video + audio (if available)
    await getUserMedia(true, true);
    setVideo(true);
    setAudio(true);

    // slight delay to ensure media is ready & this is a user gesture
    setTimeout(connectToSocketServer, 300);
  };

  const handleVideo = async () => {
    const nv = !video;
    setVideo(nv);
    if (!screen) await getUserMedia(nv, audio);

    if (!nv && window.localStream) {
      window.localStream.getVideoTracks().forEach(t => t.stop());
    }
  };

  const handleAudio = async () => {
    const na = !audio;
    setAudio(na);
    if (!screen) await getUserMedia(video, na);
    if (!na && window.localStream) {
      window.localStream.getAudioTracks().forEach(t => t.stop());
    }
  };

  const handleScreen = async () => {
    if (!screen) {
      setScreen(true);
      await getDisplayMedia();
    } else {
      setScreen(false);
      if (window.localStream) window.localStream.getTracks().forEach(t => t.stop());
      await getUserMedia(video, audio);
    }
  };

  const handleEndCall = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    Object.values(connectionsRef.current).forEach(pc => pc.close());
    connectionsRef.current = {};
    try { socketRef.current?.emit('leave-call', roomId); } catch (e) {}
    socketRef.current?.disconnect();
    if (callStartTime && addToUserHistory) addToUserHistory(roomId).catch(() => {});
    navigate('/home');
  };

  // clean up when unmount
  useEffect(() => {
    return () => {
      try {
        if (localVideoRef.current?.srcObject) localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
      } catch (e) {}
      Object.values(connectionsRef.current).forEach(pc => pc.close());
      connectionsRef.current = {};
      try { socketRef.current?.disconnect(); } catch (e) {}
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      {askForDisplayName ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#111',
          }}
        >
          <Container maxWidth="sm">
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Box sx={{ mb: 2 }}>
                <PersonIcon sx={{ fontSize: 48 }} />
              </Box>
              <Typography variant="h5" sx={{ mb: 1 }}>
                Join Meeting
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Room: {roomId}
              </Typography>
              <TextField
                fullWidth
                label="Your name"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                variant="contained"
                onClick={handleConnect}
                disabled={!inputName.trim()}
              >
                Join
              </Button>
              <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="caption">Camera preview</Typography>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: 220,
                    background: '#000',
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                />
              </Paper>
            </Card>
          </Container>
        </Box>
      ) : (
        <Box
          sx={{
            height: '100vh',
            background: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* video grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 2,
              p: 2,
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <Card sx={{ position: 'relative', background: '#000', borderRadius: 2 }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 260,
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  color: '#fff',
                  bgcolor: 'rgba(0,0,0,0.6)',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {displayName} (You)
              </Box>
            </Card>

            {videos.map(v => (
              <Card
                key={v.socketId}
                sx={{ position: 'relative', background: '#000', borderRadius: 2 }}
              >
                <video
                  autoPlay
                  playsInline
                  ref={el => setVideoRef(v.socketId, el)}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 260,
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    color: '#fff',
                    bgcolor: 'rgba(0,0,0,0.6)',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                  }}
                >
                  {v.displayName}
                </Box>
              </Card>
            ))}
          </Box>

          {/* chat */}
          {showChat && (
            <Paper
              sx={{
                position: "absolute",
                right: 0,
                top: 0,
                width: { xs: "100%", sm: 360 },
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid #222",
                background: "#111",
                boxShadow: "-4px 0 15px rgba(0,0,0,0.4)",
              }}
            >
              <Box
                sx={{
                  p: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Live Chat
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowChat(false)}
                  sx={{ color: "#fff" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 1.5,
                  paddingBottom: "80px",
                }}
              >
                {messages.map((m, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: m.isOwn ? "flex-end" : "flex-start",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        mb: 0.5,
                        color: "#aaa",
                        fontSize: "0.75rem",
                      }}
                    >
                      {m.isOwn ? "You" : m.sender}
                    </Typography>

                    <Box
                      sx={{
                        maxWidth: "75%",
                        padding: "10px 14px",
                        borderRadius: 2,
                        fontSize: "0.95rem",
                        background: m.isOwn
                          ? "linear-gradient(135deg,#4f8ef7,#6aa8ff)"
                          : "#1e1e1e",
                        color: m.isOwn ? "#fff" : "#ddd",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.data}
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.4,
                        color: "#666",
                        fontSize: "0.7rem",
                      }}
                    >
                      {m.timestamp}
                    </Typography>
                  </Box>
                ))}

                <div ref={messagesEndRef} />
              </Box>

              <Box
                sx={{
                  p: 2,
                  borderTop: "1px solid #333",
                  background: "#0d0d0d",
                  display: "flex",
                  gap: 1,
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      background: "#1a1a1a",
                      color: "#eee",
                      borderRadius: "10px",
                    },
                  }}
                />

                <IconButton
                  sx={{
                    background: "#667eea",
                    color: "#fff",
                    "&:hover": { background: "#5566d4" },
                    borderRadius: "10px",
                    width: 48,
                    height: 48,
                  }}
                  onClick={sendMessage}
                  disabled={!message.trim()}
                >
                  <SendIcon />
                </IconButton>
              </Box>
            </Paper>
          )}

          {/* controls */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              bgcolor: 'rgba(0,0,0,0.7)',
            }}
          >
            <Tooltip title={video ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton
                onClick={handleVideo}
                sx={{ bgcolor: video ? '#667eea' : '#ef4444', color: '#fff' }}
              >
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={audio ? 'Mute' : 'Unmute'}>
              <IconButton
                onClick={handleAudio}
                sx={{ bgcolor: audio ? '#667eea' : '#ef4444', color: '#fff' }}
              >
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>
            {screenAvailable && (
              <Tooltip title={screen ? 'Stop sharing' : 'Share screen'}>
                <IconButton
                  onClick={handleScreen}
                  sx={{ bgcolor: screen ? '#ff9800' : '#667eea', color: '#fff' }}
                >
                  {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Chat">
              <Badge badgeContent={newMessages} color="primary">
                <IconButton
                  onClick={() => {
                    setShowChat(s => !s);
                    setNewMessages(0);
                  }}
                  sx={{ bgcolor: '#667eea', color: '#fff' }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </Tooltip>
            <Tooltip title="End call">
              <IconButton
                onClick={handleEndCall}
                sx={{ bgcolor: '#ef4444', color: '#fff' }}
              >
                <CallEndIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}
