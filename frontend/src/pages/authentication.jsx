// frontend/src/pages/authentication.jsx
import React, { useState, useContext } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import { AuthContext } from '../contexts/AuthContext';

const theme = createTheme({
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
  },
});

export default function Authentication() {
  const [email, setEmail] = useState('');          // changed from username -> email
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formState, setFormState] = useState(0);  // 0 = login, 1 = register
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { handleRegister, handleLogin } = useContext(AuthContext);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (formState === 1 && !name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (formState === 0) {
        // LOGIN: backend expects email + password
        await handleLogin(email, password);
      } else {
        // REGISTER: backend expects name + email + password
        const result = await handleRegister(name, email, password);
        setMessage(result || 'Registration successful! Please login.');
        setOpenSnackbar(true);
        setEmail('');
        setPassword('');
        setName('');
        setFormState(0);
      }
    } catch (err) {
      let errorMessage = 'Something went wrong. Please try again.';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 404) {
        errorMessage = 'User not found. Please register first.';
      } else if (err.response?.status === 409 || err.response?.status === 302) {
        errorMessage = 'User already exists. Please login.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradient 15s ease infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            width: '500px',
            height: '500px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(40px)',
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(20px)' },
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
          {/* Glassmorphism Card */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
              padding: '48px 32px',
              animation: 'slideUp 0.8s ease-out',
              '@keyframes slideUp': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(30px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  mb: 2,
                  boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                }}
              >
                <LockIcon sx={{ color: 'white', fontSize: '32px' }} />
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background:
                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                MeetUp
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: '#666',
                  fontWeight: 500,
                }}
              >
                {formState === 0 ? 'Welcome Back' : 'Join Our Community'}
              </Typography>
            </Box>

            {/* Tab Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mb: 4,
                background: '#f3f4f6',
                padding: '4px',
                borderRadius: '12px',
              }}
            >
              <Button
                fullWidth
                onClick={() => {
                  setFormState(0);
                  setError('');
                }}
                sx={{
                  py: 2,
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '16px',
                  background: formState === 0 ? 'white' : 'transparent',
                  color: formState === 0 ? '#667eea' : '#999',
                  boxShadow:
                    formState === 0
                      ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                      : 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: formState === 0 ? 'white' : '#f9fafb',
                  },
                }}
              >
                Sign In
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  setFormState(1);
                  setError('');
                }}
                sx={{
                  py: 2,
                  fontWeight: 600,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '16px',
                  background: formState === 1 ? 'white' : 'transparent',
                  color: formState === 1 ? '#667eea' : '#999',
                  boxShadow:
                    formState === 1
                      ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                      : 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: formState === 1 ? 'white' : '#f9fafb',
                  },
                }}
              >
                Sign Up
              </Button>
            </Box>

            {/* Form Fields */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
              }}
            >
              {formState === 1 && (
                <TextField
                  fullWidth
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#667eea', mr: 1 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      background: '#f9fafb',
                      border: '2px solid #e5e7eb',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#667eea',
                        background: '#f3f4f6',
                      },
                      '&.Mui-focused': {
                        background: 'white',
                        borderColor: '#667eea',
                        boxShadow:
                          '0 0 0 4px rgba(102, 126, 234, 0.1)',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      fontSize: '16px',
                      fontWeight: 500,
                    },
                  }}
                />
              )}

              <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#667eea', mr: 1 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#667eea',
                      background: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      background: 'white',
                      borderColor: '#667eea',
                      boxShadow:
                        '0 0 0 4px rgba(102, 126, 234, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '16px',
                    fontWeight: 500,
                  },
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#667eea', mr: 1 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleClickShowPassword}
                        edge="end"
                        sx={{ color: '#667eea' }}
                      >
                        {showPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#667eea',
                      background: '#f3f4f6',
                    },
                    '&.Mui-focused': {
                      background: 'white',
                      borderColor: '#667eea',
                      boxShadow:
                        '0 0 0 4px rgba(102, 126, 234, 0.1)',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '16px',
                    fontWeight: 500,
                  },
                }}
              />
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert
                severity="error"
                sx={{
                  mt: 2.5,
                  borderRadius: '12px',
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  '& .MuiAlert-icon': {
                    color: '#dc2626',
                  },
                }}
              >
                {error}
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              fullWidth
              onClick={handleAuth}
              disabled={loading}
              sx={{
                mt: 3.5,
                py: 1.5,
                fontSize: '16px',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow:
                    '0 12px 24px rgba(102, 126, 234, 0.6)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: '#ccc',
                  boxShadow: 'none',
                  opacity: 0.6,
                },
              }}
            >
              {loading ? (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  Loading...
                </Box>
              ) : formState === 0 ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Footer Text */}
            <Typography
              variant="body2"
              sx={{
                textAlign: 'center',
                mt: 3,
                color: '#999',
                fontWeight: 500,
              }}
            >
              {formState === 0
                ? "Don't have an account? "
                : 'Already have an account? '}
              <span
                onClick={() => {
                  setFormState(formState === 0 ? 1 : 0);
                  setError('');
                }}
                style={{
                  color: '#667eea',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'color 0.3s ease',
                }}
                onMouseEnter={(e) => (e.target.style.color = '#764ba2')}
                onMouseLeave={(e) => (e.target.style.color = '#667eea')}
              >
                {formState === 0 ? 'Sign Up' : 'Sign In'}
              </span>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Success Snackbar */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ borderRadius: '12px' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
