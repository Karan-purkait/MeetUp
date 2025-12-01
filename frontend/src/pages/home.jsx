import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  TextField,
  Alert,
  Typography,
  Paper,
  Container,
  Card,
  Avatar,
  Chip,
  Fade,
  CircularProgress,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { AuthContext } from '../contexts/AuthContext';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#667eea' },
    secondary: { main: '#764ba2' },
  }
});

function HomeComponent() {
  let navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { addToUserHistory } = useContext(AuthContext);

  let handleJoinVideoCall = async () => {
    if (!meetingCode.trim()) {
      setError("Please enter a meeting code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("Joining meeting with code:", meetingCode);

      try {
        await addToUserHistory(meetingCode);
        console.log("Added to history");
      } catch (historyErr) {
        console.warn("Failed to add to history (non-critical):", historyErr.message);
      }

      navigate(`/${meetingCode}`);
    } catch (err) {
      console.error("Join call error:", err);
      setError("Failed to join call. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        '@keyframes gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        }
      }}>
        <Box sx={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '500px',
          height: '500px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 6s ease-in-out infinite',
        }} />
        <Box sx={{
          position: 'absolute',
          bottom: '-30%',
          left: '-30%',
          width: '400px',
          height: '400px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }} />

        <Paper elevation={0} sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          px: 3,
          py: 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                <VideoCallIcon />
              </Avatar>
              <Typography variant="h5" sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                MeetUp
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="History"
                icon={<RestoreIcon />}
                onClick={() => navigate("/history")}
                sx={{
                  height: 40,
                  fontWeight: 600,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(-2px)',
                  }
                }}
              />
              <Button
                startIcon={<LogoutIcon />}
                onClick={() => {
                  localStorage.removeItem("token")
                  localStorage.removeItem("userName")
                  localStorage.removeItem("userId")
                  navigate("/auth")
                }}
                sx={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  fontWeight: 600,
                  borderRadius: '20px',
                  px: 3,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'rgba(239, 68, 68, 0.3)',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  }
                }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Paper>

        <Container maxWidth="lg" sx={{ pt: 12, pb: 8, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 6, alignItems: 'center', mt: 4 }}>
            <Box sx={{ flex: 1, textAlign: { xs: 'center', lg: 'left' } }}>
              <Fade in timeout={800}>
                <Typography variant="h1" sx={{
                  fontSize: { xs: '3rem', md: '4.5rem' },
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                  mb: 3,
                }}>
                  Premium Video<br />Meetings
                </Typography>
              </Fade>

              <Fade in timeout={1200}>
                <Typography variant="h6" sx={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  mb: 5,
                  maxWidth: 500,
                }}>
                  Experience crystal-clear video calls with real-time collaboration
                </Typography>
              </Fade>

              <Paper elevation={0} sx={{
                p: 3,
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(20px)',
                background: 'rgba(255,255,255,0.1)',
                mb: 4,
              }}>
                {error && (
                  <Fade in>
                    <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
                      {error}
                    </Alert>
                  </Fade>
                )}

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    onChange={e => setMeetingCode(e.target.value)}
                    value={meetingCode}
                    label="Enter Meeting Code"
                    variant="outlined"
                    placeholder="e.g., abc123"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '16px',
                        background: 'rgba(255,255,255,0.9)',
                        '&.Mui-focused': {
                          boxShadow: `0 0 0 3px rgba(102, 126, 234, 0.3)`,
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={handleJoinVideoCall}
                    variant='contained'
                    disabled={loading || !meetingCode.trim()}
                    sx={{
                      minWidth: 120,
                      borderRadius: '16px',
                      py: 1.8,
                      px: 4,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 12px 24px rgba(102, 126, 234, 0.4)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 18px 36px rgba(102, 126, 234, 0.6)',
                      },
                    }}
                  >
                    {loading ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                        Joining...
                      </>
                    ) : (
                      <>
                        <VideoCallIcon sx={{ mr: 1 }} />
                        Join
                      </>
                    )}
                  </Button>
                </Box>
              </Paper>
            </Box>

            <Box sx={{ flex: 1, display: { xs: 'none', lg: 'flex' }, justifyContent: 'center' }}>
              <Card sx={{
                width: 400,
                height: 400,
                borderRadius: '32px',
                overflow: 'hidden',
                boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                <Box sx={{ height: 250, background: '#000', position: 'relative' }}>
                  <Box sx={{
                    position: 'absolute',
                    top: 40,
                    left: 40,
                    right: 40,
                    bottom: 40,
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                  }}>
                    Live Video Call
                  </Box>
                </Box>
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#667eea' }}>
                    Instant Meetings
                  </Typography>
                </Box>
              </Card>
            </Box>
          </Box>
        </Container>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        `}</style>
      </Box>
    </ThemeProvider>
  )
}

export default withAuth(HomeComponent)