// src/components/VideoMeet.jsx
import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from "react";
import io from "socket.io-client";
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
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import SendIcon from "@mui/icons-material/Send";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import server from "../environment";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const theme = createTheme({
  palette: {
    primary: { main: "#667eea" },
    secondary: { main: "#764ba2" },
  },
});

const peerConfigConnections = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Add TURN servers here for production if you have credentials
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

  // state
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [videoOn, setVideoOn] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const [askForDisplayName, setAskForDisplayName] = useState(true);
  const [inputName, setInputName] = useState("");
  const [displayName, setDisplayName] = useState("Guest");

  const [showChat, setShowChat] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [videos, setVideos] = useState([]); // {socketId, stream, displayName}
  const [callStartTime, setCallStartTime] = useState(null);

  const messagesEndRef = useRef(null);

  // preload saved name
  useEffect(() => {
    const saved = localStorage.getItem("userName");
    if (saved) {
      setDisplayName(saved);
      setInputName(saved);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // device check using enumerateDevices (no permission prompts)
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
        const hasVideo = devices.some((d) => d.kind === "videoinput");
        const hasAudio = devices.some((d) => d.kind === "audioinput");
        setVideoAvailable(hasVideo);
        setAudioAvailable(hasAudio);
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
      } catch (e) {
        console.error("device check error", e);
        setVideoAvailable(false);
        setAudioAvailable(false);
        setScreenAvailable(false);
      }
    };
    checkDevices();
  }, []);

  // -------------------------
  // Video element helper
  // -------------------------
  const setVideoRef = (socketId, el) => {
    if (el) {
      try {
        el.autoplay = true;
        el.playsInline = true;
        el.controls = false;
        // remote streams should be audible, not muted
        el.muted = false;
      } catch (e) {
        // ignore
      }

      // attach existing stream if already available
      const existing = videos.find((v) => v.socketId === socketId);
      if (existing && existing.stream && el.srcObject !== existing.stream) {
        el.srcObject = existing.stream;
        el.play().catch(() => {});
      }

      videoRefs.current[socketId] = el;
    } else {
      if (videoRefs.current[socketId]) {
        try {
          videoRefs.current[socketId].srcObject = null;
        } catch (e) {}
      }
      delete videoRefs.current[socketId];
    }
  };

  // attach remote streams to DOM when videos state changes
  useEffect(() => {
    videos.forEach((v) => {
      const el = videoRefs.current[v.socketId];
      if (el && v.stream && el.srcObject !== v.stream) {
        el.srcObject = v.stream;
        el.play().catch(() => {});
      }
    });
  }, [videos]);

  // add local tracks to a pc (safely)
  const addLocalTracksToPc = (pc) => {
    if (!window.localStream) return;
    const senders = pc.getSenders ? pc.getSenders() : [];
    window.localStream.getTracks().forEach((track) => {
      const already = senders.find(
        (s) => s.track && s.track.kind === track.kind
      );
      if (!already) {
        try {
          pc.addTrack(track, window.localStream);
        } catch (e) {}
      } else {
        try {
          already.replaceTrack && already.replaceTrack(track);
        } catch (e) {}
      }
    });
  };

  // replace tracks in all connections when local stream changes
  const replaceTracksInConnections = (stream) => {
    Object.values(connectionsRef.current).forEach((pc) => {
      if (!pc.getSenders) return;
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find(
          (s) => s.track && s.track.kind === track.kind
        );
        if (sender && sender.replaceTrack) {
          try {
            sender.replaceTrack(track);
          } catch (e) {}
        } else {
          try {
            pc.addTrack(track, stream);
          } catch (e) {}
        }
      });
    });
  };

  // -------------------------
  // Unified getMedia that requests both video+audio at once
  // Tries to give priority to this app (request together), fallbacks if blocked
  // -------------------------
  const getMediaUnified = useCallback(async () => {
    // Try to get both video+audio in one call (preferred)
    try {
      const constraints = {
        video: videoAvailable ? { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: audioAvailable ? { echoCancellation: true, noiseSuppression: true } : false,
      };

      // If both false -> nothing to do
      if (!constraints.video && !constraints.audio) {
        window.localStream = null;
        return { stream: null, state: "no-devices" };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // stop old tracks (but don't stop the ones shared with new stream)
      if (window.localStream) {
        try {
          window.localStream.getTracks().forEach((t) => {
            if (!stream.getTracks().some((nt) => nt.id === t.id)) t.stop();
          });
        } catch (e) {}
      }

      window.localStream = stream;

      // set local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // preview muted to avoid echo
        localVideoRef.current.playsInline = true;
        localVideoRef.current.autoplay = true;
        try {
          await localVideoRef.current.play();
        } catch (e) {
          // mobile may block autoplay until user gesture - join button is the gesture
        }
      }

      // replace on connections
      replaceTracksInConnections(stream);

      // update toggles according to actual tracks
      setVideoOn(stream.getVideoTracks().length > 0);
      setAudioOn(stream.getAudioTracks().length > 0);

      return { stream, state: "ok" };
    } catch (err) {
      console.warn("getMediaUnified primary fail:", err);

      // If primary fails, try fallbacks: try audio-only, then video-only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.localStream = audioStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = audioStream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.autoplay = true;
          localVideoRef.current.play().catch(() => {});
        }
        replaceTracksInConnections(audioStream);
        setVideoOn(false);
        setAudioOn(true);
        return { stream: audioStream, state: "audio-only" };
      } catch (err2) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          window.localStream = videoStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = videoStream;
            localVideoRef.current.muted = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.autoplay = true;
            localVideoRef.current.play().catch(() => {});
          }
          replaceTracksInConnections(videoStream);
          setVideoOn(true);
          setAudioOn(false);
          return { stream: videoStream, state: "video-only" };
        } catch (err3) {
          console.error("getMediaUnified all fallbacks failed:", err3);
          // nothing available or blocked
          setVideoOn(false);
          setAudioOn(false);
          return { stream: null, state: "blocked" };
        }
      }
    }
  }, [videoAvailable, audioAvailable]);

  // -------------------------
  // enable/disable local track (no new permission prompt)
  // -------------------------
  const setLocalTrackEnabled = async (kind, enabled) => {
    if (window.localStream) {
      const tracks = window.localStream.getTracks().filter(t => t.kind === kind);
      if (tracks.length) {
        tracks.forEach(t => { t.enabled = enabled; });
        // update UI states
        if (kind === "video") setVideoOn(enabled);
        if (kind === "audio") setAudioOn(enabled);
        // replace senders to ensure state sync
        replaceTracksInConnections(window.localStream);
        return true;
      } else if (enabled) {
        // if enabling and there's no track, request media unified (asks permission once)
        const res = await getMediaUnified();
        return !!res.stream;
      }
    } else if (enabled) {
      const res = await getMediaUnified();
      return !!res.stream;
    }
    return false;
  };

  // -------------------------
  // Screen sharing
  // -------------------------
  const getDisplayMedia = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
      });

      // keep audio tracks if we had them
      const audioTracks = window.localStream ? window.localStream.getAudioTracks() : [];
      if (audioTracks.length) {
        audioTracks.forEach(t => screenStream.addTrack(t));
      }

      // stop old tracks
      if (window.localStream) {
        window.localStream.getTracks().forEach(t => t.stop());
      }

      window.localStream = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(() => {});
      }

      replaceTracksInConnections(screenStream);

      screenStream.getTracks().forEach(track => {
        track.onended = () => {
          setScreenOn(false);
          // restore camera/mic with current toggles
          getMediaUnified();
        };
      });

      setScreenOn(true);
    } catch (e) {
      console.error("displayMedia error", e);
      setScreenOn(false);
    }
  };

  // -------------------------
  // Peer Connection creation
  // -------------------------
  const createPeerConnection = (remoteId, remoteName = "Guest") => {
    if (connectionsRef.current[remoteId]) return connectionsRef.current[remoteId];

    const pc = new RTCPeerConnection(peerConfigConnections);
    connectionsRef.current[remoteId] = pc;
    remoteNamesRef.current[remoteId] = remoteName;

    pc.onicecandidate = (ev) => {
      if (ev.candidate && socketRef.current?.connected) {
        socketRef.current.emit("signal", remoteId, JSON.stringify({ ice: ev.candidate }), displayName);
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      setVideos(prev => {
        const existing = prev.find(v => v.socketId === remoteId);
        const obj = {
          socketId: remoteId,
          stream,
          displayName: remoteNamesRef.current[remoteId] || remoteName || "Guest",
        };
        if (existing) return prev.map(v => (v.socketId === remoteId ? obj : v));
        return [...prev, obj];
      });

      // attach to DOM if element exists
      const el = videoRefs.current[remoteId];
      if (el) {
        try {
          el.srcObject = stream;
          el.muted = false; // ensure remote audio is audible
          el.playsInline = true;
          el.autoplay = true;
          el.play().catch(() => {});
        } catch (e) {}
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        try { pc.close(); } catch (e) {}
        delete connectionsRef.current[remoteId];
        setVideos(prev => prev.filter(v => v.socketId !== remoteId));
      }
    };

    // add existing local tracks (if available)
    addLocalTracksToPc(pc);

    return pc;
  };

  // -------------------------
  // Handle incoming signals (SDP/ICE)
  // -------------------------
  const handleSignal = useCallback(
    async (fromId, message, senderName) => {
      try {
        if (senderName) remoteNamesRef.current[fromId] = senderName;

        const signal = typeof message === "string" ? JSON.parse(message) : message;

        let pc = connectionsRef.current[fromId];
        if (!pc) {
          pc = createPeerConnection(fromId, senderName || "Guest");
        }

        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          await pc.setRemoteDescription(desc);

          if (signal.sdp.type === "offer") {
            // ensure our local tracks are on this pc before answering
            addLocalTracksToPc(pc);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: pc.localDescription }), displayName);
          }
        }

        if (signal.ice) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
          } catch (err) {
            console.warn("addIceCandidate failed", err);
          }
        }
      } catch (e) {
        console.error("handleSignal", e);
      }
    },
    [displayName]
  );

  // -------------------------
  // Socket & WebRTC wiring
  // -------------------------
// Replace the connectToSocketServer function in VideoMeet.jsx with this fixed version

const connectToSocketServer = useCallback(() => {
  socketRef.current = io(server, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socketRef.current.on("connect", () => {
    socketIdRef.current = socketRef.current.id;
    socketRef.current.emit("join-call", roomId || "default", displayName);
  });

  socketRef.current.on("signal", (fromId, message, senderName) => {
    handleSignal(fromId, message, senderName);
  });

  socketRef.current.on("user-joined", (userId, senderName, clients) => {
    try {
      if (userId === socketIdRef.current) return;
      if (connectionsRef.current[userId]) return;

      const pc = createPeerConnection(userId, senderName || "Guest");
      addLocalTracksToPc(pc);

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current.emit("signal", userId, JSON.stringify({ sdp: pc.localDescription }), displayName);
        })
        .catch((err) => console.error("createOffer error", err));
    } catch (e) {
      console.error("user-joined handler error", e);
    }
  });

  socketRef.current.on("user-left", (userId) => {
    if (connectionsRef.current[userId]) {
      try { 
        connectionsRef.current[userId].close(); 
      } catch (e) {}
      delete connectionsRef.current[userId];
    }
    setVideos(prev => prev.filter(v => v.socketId !== userId));
    delete remoteNamesRef.current[userId];
  });

  // FIXED: Proper chat-message handler
  socketRef.current.on("chat-message", (messageText, sender, socketIdSender) => {
    try {
      // Ensure messageText is a string (not an object)
      const cleanMessage = typeof messageText === "string" 
        ? messageText 
        : typeof messageText === "object" && messageText !== null
        ? messageText.data || String(messageText)
        : String(messageText || "");

      // Validate we have the data we need
      if (!cleanMessage || !sender || !socketIdSender) {
        console.warn("⚠️ Invalid chat message received:", { messageText, sender, socketIdSender });
        return;
      }

      const msg = {
        sender: String(sender),
        data: cleanMessage,
        timestamp: new Date().toLocaleTimeString(),
        socketId: socketIdSender,
        isOwn: socketIdSender === socketIdRef.current,
      };

      console.log("📨 Valid chat message received:", msg);

      setMessages(prev => {
        if (!Array.isArray(prev)) {
          return [msg];
        }
        return [...prev, msg];
      });

      if (socketIdSender !== socketIdRef.current && !showChat) {
        setNewMessages(n => n + 1);
      }
    } catch (error) {
      console.error("❌ Error processing chat message:", error);
    }
  });

  socketRef.current.on("disconnect", () => {
    Object.values(connectionsRef.current).forEach(pc => pc.close());
    connectionsRef.current = {};
    setVideos([]);
  });
}, [roomId, displayName, handleSignal, showChat]);

  // send chat
// Replace the sendMessage function in VideoMeet.jsx with this fixed version

// send chat - FIXED VERSION
const sendMessage = useCallback(() => {
  if (!message.trim() || !socketRef.current?.connected) {
    console.warn("Cannot send: message empty or socket not connected");
    return;
  }

  try {
    const msg = {
      sender: displayName || "Guest",
      data: message.trim(),
      timestamp: new Date().toLocaleTimeString(),
      socketId: socketIdRef.current,
      isOwn: true,
    };

    // Emit to server with proper parameters
    socketRef.current.emit("chat-message", message.trim(), displayName || "Guest", socketIdRef.current);

    // Add to local state immediately
    setMessages(prev => {
      if (!Array.isArray(prev)) {
        return [msg];
      }
      return [...prev, msg];
    });

    console.log("📤 Message sent:", msg);
    setMessage("");
  } catch (error) {
    console.error("Error sending message:", error);
  }
}, [message, displayName]);

  // -------------------------
  // UI handlers
  // -------------------------
  const handleConnect = async () => {
    const name = inputName.trim();
    if (!name) {
      alert("Please enter your display name");
      return;
    }
    setDisplayName(name);
    localStorage.setItem("userName", name);
    setAskForDisplayName(false);
    setCallStartTime(new Date());

    // Request camera+mic together once (this is user gesture from the Join button)
    const res = await getMediaUnified();
    if (!res.stream) {
      if (res.state === "blocked" || res.state === "no-devices") {
        alert("Camera &/or microphone blocked or unavailable. You can still join (audio/video disabled).");
      }
    }

    // small delay then connect sockets (user gesture occurred on Join click so autoplay allowed)
    setTimeout(connectToSocketServer, 200);
  };

  // toggle video: try to enable/disable track instead of new permission call
  const handleToggleVideo = async () => {
    const enabling = !videoOn;
    const ok = await setLocalTrackEnabled("video", enabling);
    if (!ok && enabling) {
      // fallback to requesting both (permission)
      const res = await getMediaUnified();
      if (!res.stream) {
        alert("Unable to enable camera. It may be blocked by another app or browser permission.");
      }
    }
  };

  // toggle audio
  const handleToggleAudio = async () => {
    const enabling = !audioOn;
    const ok = await setLocalTrackEnabled("audio", enabling);
    if (!ok && enabling) {
      const res = await getMediaUnified();
      if (!res.stream) {
        alert("Unable to enable microphone. It may be blocked by another app or browser permission.");
      }
    }
  };

  // toggle screen share
  const handleToggleScreen = async () => {
    if (!screenOn) {
      await getDisplayMedia();
    } else {
      setScreenOn(false);
      if (window.localStream) {
        window.localStream.getTracks().forEach(t => t.stop());
      }
      // restore camera+mic based on toggles
      await getMediaUnified();
    }
  };

  const handleEndCall = () => {
    if (localVideoRef.current?.srcObject) {
      localVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    Object.values(connectionsRef.current).forEach(pc => pc.close());
    connectionsRef.current = {};
    try { socketRef.current?.emit("leave-call", roomId); } catch (e) {}
    socketRef.current?.disconnect();
    if (callStartTime && addToUserHistory) addToUserHistory(roomId).catch(() => {});
    navigate("/home");
  };

  // cleanup when unmount
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
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111",
          }}
        >
          <Container maxWidth="sm">
            <Card sx={{ p: 4, textAlign: "center" }}>
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
                onChange={(e) => setInputName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
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
                    width: "100%",
                    height: 220,
                    background: "#000",
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
            height: "100vh",
            background: "#000",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* video grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 2,
              p: 2,
              height: "100%",
              overflowY: "auto",
            }}
          >
            <Card sx={{ position: "relative", background: "#000", borderRadius: 2 }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 260,
                  objectFit: "cover",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  color: "#fff",
                  bgcolor: "rgba(0,0,0,0.6)",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {displayName} (You)
              </Box>
            </Card>

            {videos.map((v) => (
              <Card
                key={v.socketId}
                sx={{ position: "relative", background: "#000", borderRadius: 2 }}
              >
                <video
                  autoPlay
                  playsInline
                  ref={(el) => setVideoRef(v.socketId, el)}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 260,
                    objectFit: "cover",
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 8,
                    left: 8,
                    color: "#fff",
                    bgcolor: "rgba(0,0,0,0.6)",
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
         {/* chat */}
// Replace the chat section in VideoMeet.jsx with this enhanced version

{/* ENHANCED CHAT */}
{showChat && (
  <Paper
    sx={{
      position: "absolute",
      right: 0,
      top: 0,
      width: { xs: "100%", sm: 420 },
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      borderLeft: "2px solid rgba(167, 139, 250, 0.5)",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.6), inset -1px 0 20px rgba(167, 139, 250, 0.1)",
      backdropFilter: "blur(10px)",
      zIndex: 1000,
    }}
  >
    {/* Chat Header */}
    <Box
      sx={{
        p: 2.5,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        borderBottom: "2px solid rgba(167, 139, 250, 0.3)",
        boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            background: "#4ade80",
            borderRadius: "50%",
            boxShadow: "0 0 10px #4ade80",
          }}
        />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: "#fff",
            fontSize: "1.1rem",
            letterSpacing: "0.5px",
          }}
        >
          Enchanted Chat
        </Typography>
      </Box>

      <IconButton
        size="small"
        onClick={() => setShowChat(false)}
        sx={{
          color: "#fff",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "rgba(255,255,255,0.2)",
          },
        }}
      >
        <CloseIcon />
      </IconButton>
    </Box>

    {/* Messages Container */}
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        background: "linear-gradient(to bottom, rgba(15, 12, 41, 0.8), rgba(48, 43, 99, 0.6))",

        "&::-webkit-scrollbar": {
          width: "6px",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "linear-gradient(to bottom, #a78bfa, #667eea)",
          borderRadius: "3px",
        },
      }}
    >
      {!Array.isArray(messages) || messages.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ color: "#a78bfa" }}>
            ✨ Welcome to the Enchanted Realm ✨
          </Typography>
          <Typography variant="caption" sx={{ color: "#666" }}>
            Messages will appear here
          </Typography>
        </Box>
      ) : (
        messages.map((m, i) => {
          // Safety check - skip invalid messages
          if (!m || typeof m !== "object" || !m.data) {
            return null;
          }

          return (
            <Box
              key={`msg-${i}`}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.isOwn ? "flex-end" : "flex-start",
              }}
            >
              {/* Sender Name */}
              <Typography
                variant="caption"
                sx={{
                  mb: 0.5,
                  color: m.isOwn ? "#a78bfa" : "#64748b",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {m.isOwn ? "⚔️ You" : `🧙 ${m.sender || "Unknown"}`}
              </Typography>

              {/* Message Bubble */}
              <Box
                sx={{
                  maxWidth: "80%",
                  padding: "12px 16px",
                  borderRadius: m.isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  wordBreak: "break-word",
                  transition: "all 0.3s ease",
                  background: m.isOwn
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(118, 75, 162, 0.15) 100%)",
                  border: m.isOwn
                    ? "1px solid rgba(167, 139, 250, 0.4)"
                    : "1px solid rgba(167, 139, 250, 0.3)",
                  color: m.isOwn ? "#fff" : "#e2e8f0",
                  boxShadow: m.isOwn
                    ? "0 4px 16px rgba(102, 126, 234, 0.4)"
                    : "0 2px 8px rgba(0, 0, 0, 0.2)",

                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: m.isOwn
                      ? "0 6px 20px rgba(102, 126, 234, 0.5)"
                      : "0 4px 12px rgba(102, 126, 234, 0.3)",
                  },
                }}
              >
                {String(m.data)}
                {m.isOwn && <span style={{ marginLeft: "8px" }}>✨</span>}
              </Box>

              {/* Timestamp */}
              <Typography
                variant="caption"
                sx={{
                  mt: 0.4,
                  color: "#4b5563",
                  fontSize: "0.7rem",
                }}
              >
                {m.timestamp || ""}
              </Typography>
            </Box>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Box>

    {/* Input Section */}
    <Box
      sx={{
        p: 2,
        borderTop: "1px solid rgba(167, 139, 250, 0.2)",
        background: "linear-gradient(135deg, rgba(15, 12, 41, 0.9) 0%, rgba(48, 43, 99, 0.7) 100%)",
        display: "flex",
        gap: 1,
      }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Whisper your message..."
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
            background: "linear-gradient(135deg, rgba(48, 43, 99, 0.8) 0%, rgba(30, 27, 75, 0.8) 100%)",
            color: "#e2e8f0",
            borderRadius: "12px",
            border: "1px solid rgba(167, 139, 250, 0.3)",
            "&.Mui-focused": {
              borderColor: "rgba(167, 139, 250, 0.7)",
              boxShadow: "0 0 16px rgba(167, 139, 250, 0.3)",
            },
          },
          "& .MuiInputBase-input::placeholder": {
            color: "#8b8fa8",
            opacity: 1,
          },
        }}
      />
      <IconButton
        onClick={sendMessage}
        disabled={!message.trim()}
        sx={{
          width: 48,
          height: 48,
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "1px solid rgba(167, 139, 250, 0.5)",
          transition: "all 0.3s ease",

          "&:hover:not(:disabled)": {
            transform: "scale(1.05) translateY(-2px)",
            boxShadow: "0 6px 20px rgba(102, 126, 234, 0.5)",
          },

          "&:disabled": {
            opacity: 0.4,
            cursor: "not-allowed",
          },
        }}
      >
        <SendIcon sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  </Paper>
)}
          {/* controls */}
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              display: "flex",
              justifyContent: "center",
              gap: 2,
              bgcolor: "rgba(0,0,0,0.7)",
            }}
          >
            <Tooltip title={videoOn ? "Turn off camera" : "Turn on camera"}>
              <IconButton
                onClick={handleToggleVideo}
                sx={{ bgcolor: videoOn ? "#667eea" : "#ef4444", color: "#fff" }}
              >
                {videoOn ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={audioOn ? "Mute" : "Unmute"}>
              <IconButton
                onClick={handleToggleAudio}
                sx={{ bgcolor: audioOn ? "#667eea" : "#ef4444", color: "#fff" }}
              >
                {audioOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>
            {screenAvailable && (
              <Tooltip title={screenOn ? "Stop sharing" : "Share screen"}>
                <IconButton
                  onClick={handleToggleScreen}
                  sx={{ bgcolor: screenOn ? "#ff9800" : "#667eea", color: "#fff" }}
                >
                  {screenOn ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Chat">
              <Badge badgeContent={newMessages} color="primary">
                <IconButton
                  onClick={() => {
                    setShowChat((s) => !s);
                    setNewMessages(0);
                  }}
                  sx={{ bgcolor: "#667eea", color: "#fff" }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </Tooltip>
            <Tooltip title="End call">
              <IconButton onClick={handleEndCall} sx={{ bgcolor: "#ef4444", color: "#fff" }}>
                <CallEndIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}
    </ThemeProvider>
  );
}
