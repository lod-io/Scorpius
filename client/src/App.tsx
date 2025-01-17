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
  Stack,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import CloudIcon from "@mui/icons-material/Cloud";
import GitHubIcon from "@mui/icons-material/GitHub";
import { styled } from "@mui/material/styles";
import { useState, useRef, useEffect } from "react";
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
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/models`
        );
        setAvailableModels(response.data.models);
        if (response.data.models.length > 0) {
          setSelectedModel(response.data.models[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        setError("Failed to load available models");
      }
    };

    fetchModels();
  }, []);

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
    formData.append("model", selectedModel);

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

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      "Check out this AI roast I got from Scorpius! 🔥"
    );

    let shareUrl = "";
    switch (platform) {
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
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
          gap: { xs: 1, sm: 2 },
          minWidth: "100%",
          overflow: "hidden",
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: { xs: 1, sm: 2 },
            py: { xs: 1, sm: 2 },
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom>
            SCORPIUS
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Tooltip title="Share on Facebook">
              <IconButton
                onClick={() => handleShare("facebook")}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <FacebookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on X">
              <IconButton
                onClick={() => handleShare("twitter")}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <XIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on LinkedIn">
              <IconButton
                onClick={() => handleShare("linkedin")}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <LinkedInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Checkout Scorpius">
              <IconButton
                onClick={() =>
                  window.open("https://github.com/lod-io/scorpius", "_blank")
                }
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <GitHubIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Visit CLōD">
              <IconButton
                onClick={() => window.open("https://clod.io", "_blank")}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <CloudIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <FormControl sx={{ minWidth: 200, mb: 2 }}>
            <InputLabel id="model-select-label">Model</InputLabel>
            <Select
              labelId="model-select-label"
              value={selectedModel}
              label="Model"
              onChange={(e) => setSelectedModel(e.target.value)}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              {availableModels.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            component="label"
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <CloudUploadIcon />
            }
            sx={{
              fontSize: "1.2rem",
              padding: "12px 24px",
              backgroundColor: "#c97bd7",
            }}
            disabled={loading || !selectedModel}
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
                p: 1,
                maxWidth: { sm: 400 },
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
                maxWidth: { sm: 600 },
                width: "100%",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
              >
                <IconButton
                  onClick={handlePlayPause}
                  sx={{ backgroundColor: "#c97bd7" }}
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
