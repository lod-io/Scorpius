import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  CssBaseline,
  Container,
  Button,
  Box,
  Typography,
  CircularProgress,
  Paper,
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import { styled } from "@mui/material/styles";
import { useState, useRef } from "react";
import axios from "axios";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

function App() {
  const [roast, setRoast] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setRoast("");
    setAudioUrl("");

    setImagePreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/roast`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const roastText = response.data.roast;
      setRoast(roastText);

      const ttsResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/tts`,
        {
          text: roastText,
        }
      );

      console.log("TTS Response:", {
        status: ttsResponse.status,
        headers: ttsResponse.headers,
        dataKeys: Object.keys(ttsResponse.data),
      });

      const audioData = ttsResponse.data.audio;
      console.log("Audio data length:", audioData.length);

      const binaryString = window.atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(blob);
      console.log("Created audio URL:", audioUrl);
      setAudioUrl(audioUrl);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error("Axios error:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        setError(`Error: ${err.response?.data?.detail || err.message}`);
      } else {
        console.error("Unknown error:", err);
        setError("Failed to get roast. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          minWidth: "100%",
          overflow: "hidden",
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            SCORPIUS
          </Typography>

          <Button
            component="label"
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <CloudUploadIcon />
            }
            sx={{
              fontSize: "1.2rem",
              padding: "12px 24px",
            }}
            disabled={loading}
          >
            {loading ? "Roasting..." : "Upload Selfie"}
            <VisuallyHiddenInput
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </Button>

          {error && (
            <Typography color="error" variant="body1">
              {error}
            </Typography>
          )}

          {imagePreview && (
            <Paper
              elevation={3}
              sx={{
                p: 2,
                maxWidth: { xs: "95%", sm: 400 },
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <img
                src={imagePreview}
                alt="Uploaded selfie"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "4px",
                }}
              />
            </Paper>
          )}

          {roast && audioUrl && (
            <Paper
              elevation={3}
              sx={{
                p: 2,
                maxWidth: { xs: "95%", sm: 600 },
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <IconButton
                  onClick={handlePlayPause}
                  sx={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: "none" }}
                />
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {roast}
              </Typography>
            </Paper>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
