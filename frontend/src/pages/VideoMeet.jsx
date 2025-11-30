import React, { useEffect, useRef, useState, useContext } from 'react';
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
  CircularProgress,
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
import { useParams } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // ✅ ADD AUTH CONTEXT

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
  ],
};

export default function VideoMeetComponent() {
  const { roomId } = useParams();
  const { getHistoryOfUser } = useContext(AuthContext); // ✅ USE AUTH CONTEXT
  const socketRef = useRef(null);
  const socketIdRef = useRef(null);
  const localVideoRef = useRef(null);
  const videoRef = useRef([]);

  const [videoAvailable, setVideoAvailable] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);

  const [video, setVideo] = useState(false);
  const [audio, setAudio] = useState(false);
  const [screen, setScreen] = useState(false);

  // ✅ FIXED: Better username handling
  const [askForDisplayName, setAskForDisplayName] = useState(true);
  const [inputName, setInputName] = useState('');
  const [displayName, setDisplayName] = useState('Guest'); // ✅ Real display name
  const [showChat, setShowChat] = useState(false);
  const [newMessages, setNewMessages] = useState(0);

  const [videos, setVideos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const connectionsRef = useRef({});
  const messagesEndRef = useRef(null);

  // ✅ AUTO-LOAD USERNAME FROM TOKEN
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Try to get user info from token or use fallback
      setDisplayName(localStorage.getItem('userName') || 'User');
      setAskForDisplayName(false); // Skip name input if logged in
    }
  }, []);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoStream.getTracks().forEach((track) => track.stop());
          setVideoAvailable(true);
        } catch (e) {
          setVideoAvailable(false);
        }

        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getTracks().forEach((track) => track.stop());
          setAudioAvailable(true);
        } catch (e) {
          setAudioAvailable(false);
        }

        if (navigator.mediaDevices.getDisplayMedia) {
          setScreenAvailable(true);
        } else {
          setScreenAvailable(false);
        }
      } catch (error) {
        console.error('Permission check error:', error);
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getUserMedia = async (videoEnabled, audioEnabled) => {
    try {
      if (videoEnabled || audioEnabled) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled,
        });

        window.localStream = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        Object.values(connectionsRef.current).forEach((conn) => {
          if (conn && conn.getSenders) {
            stream.getTracks().forEach((newTrack) => {
              conn.getSenders().forEach((sender) => {
                if (sender.track && sender.track.kind === newTrack.kind) {
                  sender.replaceTrack(newTrack).catch((e) =>
                    console.warn('Replace track error:', e.message)
                  );
                }
              });
            });
          }
        });

        stream.getTracks().forEach((track) => {
          track.onended = () => {
            if (track.kind === 'video') setVideo(false);
            else if (track.kind === 'audio') setAudio(false);
          };
        });
      } else {
        if (localVideoRef.current?.srcObject) {
          localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
          localVideoRef.current.srcObject = null;
        }
        window.localStream = null;
      }
    } catch (error) {
      console.error('getUserMedia error:', error);
    }
  };

  const getDisplayMedia = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      if (window.localStream) {
        // Stop current stream tracks
        window.localStream.getTracks().forEach((track) => track.stop());
      }
      
      window.localStream = screenStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      Object.entries(connectionsRef.current).forEach(([peerId, conn]) => {
        if (conn && conn.getSenders) {
          // Remove old tracks and add new screen tracks
          conn.getSenders().forEach(sender => conn.removeTrack(sender));
          
          screenStream.getTracks().forEach((track) => {
            conn.addTrack(track, screenStream);
          });
        }
      });

      screenStream.getTracks().forEach((track) => {
        track.onended = () => {
          setScreen(false);
          // Go back to camera/mic stream when screen share stops
          getUserMedia(video, audio);
        };
      });
    } catch (error) {
      console.error('getDisplayMedia error:', error);
      setScreen(false);
    }
  }; // ✅ FIXED: Missing closing brace added here

  const handleSignal = (fromId, message) => {
    const signal = JSON.parse(message);

    if (!connectionsRef.current[fromId]) {
      console.warn(`Connection for ${fromId} not found`);
      return;
    }

    const connection = connectionsRef.current[fromId];

    if (signal.sdp) {
      connection
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === 'offer') {
            return connection.createAnswer();
          }
          return null;
        })
        .then((answer) => {
          if (answer) {
            return connection.setLocalDescription(answer);
          }
        })
        .then(() => {
          if (signal.sdp.type === 'offer') {
            socketRef.current.emit(
              'signal',
              fromId,
              JSON.stringify({ sdp: connection.localDescription })
            );
          }
        })
        .catch((e) => console.error('SDP handling error:', e.message));
    }

    if (signal.ice) {
      connection
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((e) => console.warn('ICE candidate error:', e.message));
    }
  }; // ✅ FIXED: Missing closing brace added here

  const connectToSocketServer = async () => {
    socketRef.current = io(server, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      socketIdRef.current = socketRef.current.id;
      const roomToJoin = roomId || window.location.pathname;
      socketRef.current.emit('join-call', roomToJoin);

      if (window.localStream) {
        Object.values(connectionsRef.current).forEach((conn) => {
          window.localStream.getTracks().forEach((track) => {
            conn.addTrack(track, window.localStream);
          });
        });
      }
    });

    socketRef.current.on('signal', (fromId, message) => {
      handleSignal(fromId, message);
    });

    socketRef.current.on('user-joined', (userId, allClients) => {
      allClients.forEach((clientId) => {
        if (clientId === socketIdRef.current) return;

        if (!connectionsRef.current[clientId]) {
          const peerConnection = new RTCPeerConnection(peerConfigConnections);
          connectionsRef.current[clientId] = peerConnection;

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                'signal',
                clientId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          peerConnection.ontrack = (event) => {
            const videoExists = videoRef.current.find((v) => v.socketId === clientId);

            if (videoExists) {
              setVideos((prevVideos) =>
                prevVideos.map((v) =>
                  v.socketId === clientId ? { ...v, stream: event.streams[0] } : v
                )
              );
            } else {
              const newVideo = {
                socketId: clientId,
                stream: event.streams[0],
              };
              setVideos((prevVideos) => {
                const updated = [...prevVideos, newVideo];
                videoRef.current = updated;
                return updated;
              });
            }
          };

          if (window.localStream) {
            window.localStream.getTracks().forEach((track) => {
              peerConnection.addTrack(track, window.localStream);
            });
          }

          if (userId === socketIdRef.current) {
            peerConnection
              .createOffer()
              .then((offer) => peerConnection.setLocalDescription(offer))
              .then(() => {
                socketRef.current.emit(
                  'signal',
                  clientId,
                  JSON.stringify({ sdp: peerConnection.localDescription })
                );
              })
              .catch((e) => console.error('Offer creation error:', e.message));
          }
        }
      });
    });

    socketRef.current.on('user-left', (userId) => {
      if (connectionsRef.current[userId]) {
        connectionsRef.current[userId].close();
        delete connectionsRef.current[userId];
      }

      setVideos((prevVideos) => prevVideos.filter((video) => video.socketId !== userId));
    });

    // ✅ FIXED: Chat message handler
    socketRef.current.on('chat-message', (data, sender, socketIdSender) => {
      setMessages((prevMessages) => [...prevMessages, { sender, data }]);
      if (socketIdSender !== socketIdRef.current) {
        setNewMessages((prev) => prev + 1);
      }
    });
  };

  const handleVideo = async () => {
    const newVideoState = !video;
    setVideo(newVideoState);
    // If screen sharing is active, don't touch camera/mic
    if (!screen) { 
      await getUserMedia(newVideoState, audio);
    }
  };

  const handleAudio = async () => {
    const newAudioState = !audio;
    setAudio(newAudioState);
    // If screen sharing is active, don't touch camera/mic
    if (!screen) {
      await getUserMedia(video, newAudioState);
    }
  };

  const handleScreen = async () => {
    if (!screen) {
      setScreen(true);
      await getDisplayMedia();
    } else {
      setScreen(false);
      // Stop the current screen share track
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }
      // Revert to camera/mic stream
      await getUserMedia(video, audio);
    }
  };

  const handleEndCall = () => {
    try {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
      Object.values(connectionsRef.current).forEach((conn) => conn?.close());
      connectionsRef.current = {};
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    } catch (error) {
      console.error('End call error:', error);
    }
    // Simple navigation, assuming /home is a valid route
    window.location.href = '/home';
  };

  // ✅ FIXED: Use displayName instead of username
  const sendMessage = () => {
    if (!message.trim()) return;

    // Send the message along with the user's display name
    socketRef.current.emit('chat-message', message, displayName, socketIdRef.current);
    setMessages((prev) => [...prev, { sender: displayName, data: message }]);
    setMessage('');
  };

  // ✅ FIXED: Use displayName logic
  const handleConnect = async () => {
    const finalName = inputName.trim() || displayName;
    if (!finalName) {
      alert('Please enter a display name');
      return;
    }

    setDisplayName(finalName);
    localStorage.setItem('userName', finalName);

    setLoading(true);
    setAskForDisplayName(false);

    // Initial media setup
    if (videoAvailable || audioAvailable) {
      await getUserMedia(videoAvailable, audioAvailable);
      setVideo(videoAvailable);
      setAudio(audioAvailable);
    }

    connectToSocketServer();
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      {askForDisplayName ? (
        <Box
          sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            '@keyframes gradient': {
              '0%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' },
              '100%': { backgroundPosition: '0% 50%' },
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background blobs - keep exactly the same */}
          <Box
            sx={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '500px',
              height: '500px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              animation: 'float 6s ease-in-out infinite',
              '@keyframes float': {
                '0%': { transform: 'translate(0, 0) rotate(0deg)' },
                '50%': { transform: 'translate(-20px, 30px) rotate(3deg)' },
                '100%': { transform: 'translate(0, 0) rotate(0deg)' },
              },
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: '-30%',
              left: '-30%',
              width: '400px',
              height: '400px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />

          <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                p: 4,
                textAlign: 'center',
                animation: 'slideUp 0.8s ease-out',
                '@keyframes slideUp': {
                  '0%': { opacity: 0, transform: 'translateY(30px)' },
                  '100%': { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box
                sx={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                }}
              >
                <PersonIcon sx={{ color: 'white', fontSize: '48px' }} />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Welcome to MeetUp
              </Typography>

              <Typography variant="body2" sx={{ color: '#999', mb: 3 }}>
                Room: **{roomId || 'Guest'}**
              </Typography>

              {/* ✅ FIXED: Display name input */}
              <TextField
                fullWidth
                label="Enter Your Display Name"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleConnect();
                }}
                placeholder={displayName} // Use existing display name as placeholder
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    '&.Mui-focused': {
                      boxShadow: '0 0 0 4px rgba(102, 126, 234, 0.1)',
                    },
                  },
                }}
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleConnect}
                disabled={loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 700,
                  borderRadius: '12px',
                  py: 1.5,
                  mb: 3,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 24px rgba(102, 126, 234, 0.6)',
                  },
                  '&:disabled': {
                    opacity: 0.6,
                  },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Join Meeting'}
              </Button>

              <Paper
                sx={{
                  background: '#f9fafb',
                  p: 2,
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  mb: 2,
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  style={{
                    width: '100%',
                    height: '300px',
                    borderRadius: '10px',
                    backgroundColor: '#000',
                    objectFit: 'cover',
                  }}
                />
              </Paper>

              <Typography variant="caption" sx={{ color: '#999' }}>
                {videoAvailable && audioAvailable
                  ? '✅ Camera and Microphone Ready'
                  : '⚠️ Check device permissions'}
              </Typography>
            </Card>
          </Container>
        </Box>
      ) : (
        // Video call UI - keep exactly the same structure
        <Box
          sx={{
            width: '100%',
            height: '100vh',
            background: '#1a1a1a',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: 2,
              p: 2,
              overflowY: 'auto',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            }}
          >
            {/* Local Video Card */}
            <Card
              sx={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                background: '#000',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 10,
                  left: 10,
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {displayName} (You) {/* ✅ FIXED */}
              </Box>
            </Card>

            {/* Remote Videos */}
            {videos.map((video) => (
              <Card
                key={video.socketId}
                sx={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  position: 'relative',
                  background: '#000',
                }}
              >
                <video
                  autoPlay
                  playInline
                  ref={(ref) => {
                    if (ref && video.stream) {
                      ref.srcObject = video.stream;
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Guest {/* Placeholder label, as remote display names are not yet shared via signal */}
                </Box>
              </Card>
            ))}
          </Box>

          {/* Chat UI - keep exactly the same */}
          {showChat && (
            <Paper
              sx={{
                width: '320px',
                height: '100%',
                background: 'white',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.2)',
                animation: 'slideInRight 0.3s ease-out',
                '@keyframes slideInRight': {
                  '0%': { transform: 'translateX(100%)' },
                  '100%': { transform: 'translateX(0)' },
                },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Chat
                </Typography>
                <IconButton size="small" onClick={() => setShowChat(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {messages.length > 0 ? (
                  messages.map((item, index) => (
                    <Box key={index}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: '#667eea',
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        {item.sender}
                      </Typography>
                      <Paper
                        sx={{
                          p: 1.5,
                          background: '#f3f4f6',
                          borderRadius: '8px',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body2">{item.data}</Typography>
                      </Paper>
                    </Box>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#999',
                      textAlign: 'center',
                      mt: 'auto',
                      mb: 'auto',
                    }}
                  >
                    No messages yet
                  </Typography>
                )}
                <div ref={messagesEndRef} />
              </Box>

              <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') sendMessage();
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
                <IconButton
                  onClick={sendMessage}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          )}

          {/* Controls - keep exactly the same */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              p: 3,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
              animation: 'slideUp 0.5s ease-out',
              '@keyframes slideUp': {
                '0%': { opacity: 0, transform: 'translateY(20px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Tooltip title={video ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton
                onClick={handleVideo}
                sx={{
                  background: video ? 'rgba(102, 126, 234, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  color: video ? '#667eea' : '#ef4444',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: video ? 'rgba(102, 126, 234, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {video ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={audio ? 'Mute' : 'Unmute'}>
              <IconButton
                onClick={handleAudio}
                sx={{
                  background: audio ? 'rgba(102, 126, 234, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                  color: audio ? '#667eea' : '#ef4444',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: audio ? 'rgba(102, 126, 234, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {audio ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>

            {screenAvailable && (
              <Tooltip title={screen ? 'Stop sharing' : 'Share screen'}>
                <IconButton
                  onClick={handleScreen}
                  sx={{
                    background: screen ? 'rgba(255, 152, 57, 0.3)' : 'rgba(102, 126, 234, 0.3)',
                    color: screen ? '#FFA500' : '#667eea',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: screen ? 'rgba(255, 152, 57, 0.5)' : 'rgba(102, 126, 234, 0.5)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Chat">
              <Badge badgeContent={newMessages} max={999} color="primary">
                <IconButton
                  onClick={() => {
                    setShowChat(!showChat);
                    setNewMessages(0);
                  }}
                  sx={{
                    background: 'rgba(102, 126, 234, 0.3)',
                    color: '#667eea',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(102, 126, 234, 0.5)',
                      transform: 'scale(1.1)',
                    },
                  }}
                >
                  <ChatIcon />
                </IconButton>
              </Badge>
            </Tooltip>

            <Tooltip title="End Call">
              <IconButton
                onClick={handleEndCall}
                sx={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.5)',
                    transform: 'scale(1.1)',
                  },
                }}
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