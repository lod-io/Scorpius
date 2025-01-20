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
  Slider,
  Popover,
  Link,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import CloudIcon from "@mui/icons-material/Cloud";
import GitHubIcon from "@mui/icons-material/GitHub";
import WhatshotIcon from "@mui/icons-material/Whatshot";
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
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/models`
        );
        const uniqueModels = [...new Set(response.data.models as string[])];
        setAvailableModels(uniqueModels);
        if (uniqueModels.length > 0) {
          setSelectedModel(uniqueModels[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        setError("Failed to load available models");
      }
    };

    fetchModels();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        setAudioProgress(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      const handleDurationChange = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("durationchange", handleDurationChange);

      // Set initial duration if already loaded
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }

      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("durationchange", handleDurationChange);
      };
    }
  }, [audioRef.current]);

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

  const handleRoast = async (file: File) => {
    setLoading(true);
    setError("");
    setRoast("");
    setAudioUrl("");

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

      const audioData = ttsResponse.data.audio;

      const binaryString = window.atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mp3" });
      const audioUrl = URL.createObjectURL(blob);
      setAudioUrl(audioUrl);
      // Start playing the audio automatically
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100); // Small delay to ensure audio is loaded
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCurrentFile(file);
    setImagePreview(URL.createObjectURL(file));
    await handleRoast(file);
  };

  const handleReRoast = async () => {
    if (currentFile) {
      await handleRoast(currentFile);
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

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    if (audioRef.current && typeof newValue === "number") {
      const audio = audioRef.current;
      audio.currentTime = newValue;
      setAudioProgress(newValue);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: { xs: 2, sm: 3 },
          py: 4,
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
          <Typography variant="h5" component="h1">
            SCORPIUS
          </Typography>
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
              onClick={handlePopoverOpen}
              sx={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
              }}
            >
              <CloudIcon />
            </IconButton>
          </Tooltip>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
            PaperProps={{
              sx: {
                p: 2,
                maxWidth: 400,
                backgroundColor: "rgba(0, 0, 0, 0.95)",
              },
            }}
          >
            <Typography sx={{ color: "white" }}>
              Scorpius is powered by{" "}
              <Link
                href="https://clod.io"
                target="_blank"
                rel="noopener"
                sx={{ color: "#c97bd7" }}
              >
                CLōD
              </Link>
              , an AI inference cloud platform.
              <br />
              <br />
              CLōD powers Scorpius with a unique AI-driven roasting experience.
              Using its unified LLM API, CLōD crafts each roast with a different
              AI personality, making every interaction fresh and personalized.
              <br />
              <br />
              Learn more at{" "}
              <Link
                href="https://clod.io"
                target="_blank"
                rel="noopener"
                sx={{ color: "#c97bd7" }}
              >
                clod.io
              </Link>
              .
            </Typography>
          </Popover>
        </Stack>

        <FormControl sx={{ minWidth: 200 }}>
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

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Button
            component="label"
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <CloudUploadIcon />
            }
            sx={{
              fontSize: "1.2rem",
              padding: "10px 20px",
              backgroundColor: "#c97bd7",
            }}
            disabled={loading || !selectedModel}
          >
            {loading ? "Roasting..." : "Add Photo"}
            <VisuallyHiddenInput
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
          </Button>
          {roast && currentFile && !loading && (
            <Button
              variant="contained"
              startIcon={<WhatshotIcon />}
              sx={{
                fontSize: "1.2rem",
                padding: "10px 20px",
                backgroundColor: "#c97bd7",
              }}
              onClick={handleReRoast}
              disabled={loading || !currentFile}
            >
              Re-roast
            </Button>
          )}
        </Stack>

        {error && (
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        )}

        {imagePreview && (
          <Paper
            elevation={3}
            sx={{
              p: 1.5,
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

        <Stack
          direction="column"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "center" }}
        >
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
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  width: "100%",
                }}
              >
                <IconButton
                  onClick={handlePlayPause}
                  sx={{ backgroundColor: "#c97bd7" }}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Box
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(audioProgress)}
                  </Typography>
                  <Slider
                    value={audioProgress}
                    min={0}
                    max={audioDuration > 0 ? audioDuration : 100}
                    onChange={handleSliderChange}
                    sx={{
                      color: "#c97bd7",
                      "& .MuiSlider-thumb": {
                        width: 12,
                        height: 12,
                      },
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {formatTime(audioDuration || 0)}
                  </Typography>
                </Box>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (audioRef.current) {
                      setAudioProgress(audioRef.current.duration);
                    }
                  }}
                  onLoadedData={() => {
                    if (
                      audioRef.current?.duration &&
                      !isNaN(audioRef.current.duration)
                    ) {
                      setAudioDuration(audioRef.current.duration);
                    }
                  }}
                  preload="metadata"
                  style={{ display: "none" }}
                />
              </Box>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {roast}
              </Typography>
            </Paper>
          )}
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", justifyContent: "center" }}
          >
            <Typography variant="h6" component="h1">
              SHARE
            </Typography>
            <Tooltip title="Share on Facebook">
              <IconButton
                onClick={() => handleShare("facebook")}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  },
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
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  },
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
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.2)",
                  },
                }}
              >
                <LinkedInIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

export default App;
