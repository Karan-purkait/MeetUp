import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Container,
  CircularProgress,
  Grid,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#667eea' },
    secondary: { main: '#764ba2' },
  }
});

export default function History() {
  const { getHistoryOfUser } = useContext(AuthContext);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const routeTo = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const history = await getHistoryOfUser();
        console.log("Fetched history:", history);
        setMeetings(history || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [])

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear();
    return `${day}/${month}/${year}`
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
        p: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <IconButton 
            onClick={() => routeTo("/home")}
            sx={{ color: 'white', background: 'rgba(255,255,255,0.2)' }}
          >
            <HomeIcon />
          </IconButton>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            Meeting History
          </Typography>
        </Box>

        <Container maxWidth="lg">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'white' }} />
            </Box>
          ) : meetings.length > 0 ? (
            <Grid container spacing={2}>
              {meetings.map((meeting, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    p: 2,
                  }}>
                    <CardContent>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                        Room: <span style={{ color: '#667eea' }}>{meeting.roomId}</span>
                      </Typography>
                      <Typography sx={{ color: '#666', mb: 1 }}>
                        Date: {formatDate(meeting.startedAt)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#999' }}>
                        Duration: {meeting.duration} minutes
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              p: 4,
              textAlign: 'center',
            }}>
              <Typography sx={{ color: '#999' }}>
                No meeting history yet
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}