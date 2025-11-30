// frontend/src/pages/landing.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  AppBar,
  Toolbar,
  Stack,
  Chip,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
});

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          '@keyframes gradient': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
        }}
      >
        {/* Animated background blobs */}
        <Box
          sx={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '600px',
            height: '600px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'float 8s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
              '50%': { transform: 'translateY(30px) translateX(20px)' },
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-40%',
            left: '-40%',
            width: '500px',
            height: '500px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />

        {/* Navigation Bar */}
        <AppBar
          position="relative"
          sx={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
            }}
          >
            {/* Logo */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Box
                sx={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                }}
              >
                <VideoCallIcon sx={{ color: 'white', fontSize: '28px' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '28px',
                }}
              >
                MeetUp
              </Typography>
            </Box>

            {/* Navigation Links */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
              }}
            >
              <Button
                onClick={() => navigate('/aljk23')}
                sx={{
                  color: '#667eea',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#764ba2',
                  },
                }}
              >
                Join as Guest
              </Button>

              <Button
                onClick={() => navigate('/auth')}
                sx={{
                  color: '#667eea',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '16px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(102, 126, 234, 0.1)',
                    color: '#764ba2',
                  },
                }}
              >
                Register
              </Button>

              <Button
                onClick={() => navigate('/auth')}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '16px',
                  borderRadius: '10px',
                  px: 3,
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 24px rgba(102, 126, 234, 0.6)',
                  },
                }}
              >
                Login
              </Button>
            </Stack>

            {/* Mobile Menu Button */}
            <Button
              onClick={() => navigate('/auth')}
              variant="contained"
              sx={{
                display: { xs: 'flex', md: 'none' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 700,
              }}
            >
              Sign In
            </Button>
          </Toolbar>
        </AppBar>

        {/* Hero Section */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          <Grid
            container
            spacing={6}
            sx={{
              alignItems: 'center',
              minHeight: 'calc(100vh - 100px)',
            }}
          >
            {/* Left Content */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  animation: 'slideInLeft 1s ease-out',
                  '@keyframes slideInLeft': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateX(-50px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              >
                <Chip
                  label="🚀 Latest Video Call Technology"
                  sx={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                    mb: 3,
                    backdropFilter: 'blur(10px)',
                  }}
                />

                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 900,
                    color: 'white',
                    mb: 2,
                    lineHeight: 1.1,
                    fontSize: { xs: '32px', md: '56px' },
                  }}
                >
                  <span style={{ display: 'block' }}>Connect with your</span>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #FFD700 0%, #FF9839 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Loved Ones
                  </span>
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    mb: 4,
                    fontWeight: 300,
                    fontSize: '20px',
                    lineHeight: 1.6,
                  }}
                >
                  Bridge the distance with crystal-clear video calls, instant messaging, and seamless screen sharing. All in one platform.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <Button
                    component={Link}
                    to="/auth"
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      background: 'linear-gradient(135deg, #FFD700 0%, #FF9839 100%)',
                      color: '#333',
                      fontWeight: 800,
                      textTransform: 'none',
                      fontSize: '18px',
                      py: 2,
                      px: 4,
                      borderRadius: '12px',
                      boxShadow: '0 12px 24px rgba(255, 152, 57, 0.4)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 16px 32px rgba(255, 152, 57, 0.6)',
                      },
                    }}
                  >
                    Get Started
                  </Button>

                  <Button
                    onClick={() => navigate('/aljk23')}
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '18px',
                      py: 2,
                      px: 4,
                      borderRadius: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.5)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: 'white',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                      },
                    }}
                  >
                    Join as Guest
                  </Button>
                </Stack>

                {/* Stats */}
                <Stack direction="row" spacing={4}>
                  {[
                    { count: '50K+', label: 'Active Users' },
                    { count: '1M+', label: 'Calls Daily' },
                    { count: '99.9%', label: 'Uptime' },
                  ].map((stat, idx) => (
                    <Box key={idx}>
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          color: '#FFD700',
                        }}
                      >
                        {stat.count}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontWeight: 500,
                        }}
                      >
                        {stat.label}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Grid>

            {/* Right Image */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  animation: 'slideInRight 1s ease-out 0.2s both',
                  '@keyframes slideInRight': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateX(50px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              >
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                    p: 2,
                  }}
                >
                  <Box
                    component="img"
                    src="/mobile.png"
                    alt="MeetUp Mobile App"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '20px',
                      objectFit: 'cover',
                    }}
                  />
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Features Section */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            py: 12,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              sx={{
                textAlign: 'center',
                fontWeight: 800,
                color: 'white',
                mb: 8,
              }}
            >
              Why Choose MeetUp?
            </Typography>

            <Grid container spacing={4}>
              {[
                {
                  icon: VideoCallIcon,
                  title: 'HD Video Calls',
                  description: 'Crystal clear video with advanced compression technology',
                },
                {
                  icon: SecurityIcon,
                  title: 'Secure & Private',
                  description: 'End-to-end encryption for all your conversations',
                },
                {
                  icon: GroupIcon,
                  title: 'Group Meetings',
                  description: 'Connect with up to 100+ participants simultaneously',
                },
                {
                  icon: SpeedIcon,
                  title: 'Lightning Fast',
                  description: 'Optimized performance with minimal latency',
                },
              ].map((feature, idx) => (
                <Grid item xs={12} sm={6} md={3} key={idx}>
                  <Card
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '16px',
                      p: 3,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      height: '100%',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.15)',
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      <feature.icon sx={{ color: 'white', fontSize: '32px' }} />
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 700,
                        mb: 1,
                      }}
                    >
                      {feature.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            py: 12,
          }}
        >
          <Container maxWidth="md">
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                p: { xs: 3, md: 6 },
                textAlign: 'center',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2,
                }}
              >
                Ready to Get Started?
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: '#666',
                  mb: 4,
                  fontSize: '18px',
                }}
              >
                Join thousands of users connecting with loved ones every day
              </Typography>

              <Button
                component={Link}
                to="/auth"
                variant="contained"
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 800,
                  textTransform: 'none',
                  fontSize: '18px',
                  py: 2,
                  px: 6,
                  borderRadius: '12px',
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(102, 126, 234, 0.6)',
                  },
                }}
              >
                Create Your Account Now
              </Button>
            </Card>
          </Container>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            py: 4,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.7)',
          }}
        >
          <Typography variant="body2">
            © 2025 MeetUp. All rights reserved. Connect with love. 💜
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
