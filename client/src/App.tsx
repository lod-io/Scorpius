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
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

// Material UI theme configuration for dark mode
const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

// Common styles for main action buttons
const commonButtonStyle = {
  fontSize: "1.1rem",
  padding: "10px 20px",
  backgroundColor: "#c97bd7",
};

// Common styles for icon buttons
const commonIconButtonStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.2)" },
};

// Hidden input component for file uploads
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
  // State management for roast content and UI controls
  const [roast, setRoast] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<
    "analyzing" | "judging" | "roasting" | ""
  >("");
  const [error, setError] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Audio playback state management
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [imageAnalysis, setImageAnalysis] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Cleanup function for audio URL to prevent memory leaks
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  // Cleanup function for image preview to prevent memory leaks
  const cleanupImagePreview = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  // Cleanup effect for audio and image URLs on component unmount
  useEffect(() => {
    return () => {
      cleanupAudioUrl();
      cleanupImagePreview();
    };
  }, [cleanupAudioUrl, cleanupImagePreview]);

  // Fetch available AI models on component mount
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

  // Setup audio event listeners and handle audio state
  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    const handlers = {
      timeupdate: () => setAudioProgress(audio.currentTime),
      loadedmetadata: () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      },
      durationchange: () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      },
      ended: () => {
        setIsPlaying(false);
        setAudioProgress(audio.duration);
      },
      loadeddata: () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      },
    };

    // Add event listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      audio.addEventListener(event, handler);
    });

    // Set initial duration if already loaded
    if (audio.duration && !isNaN(audio.duration)) {
      setAudioDuration(audio.duration);
    }

    // Cleanup event listeners on unmount
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        audio.removeEventListener(event, handler);
      });
    };
  }, [audioRef.current]);

  // Handle play/pause toggle for audio playback
  const handlePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Process audio response from TTS API and start playback
  const processAudioResponse = useCallback(
    async (audioData: string) => {
      cleanupAudioUrl();

      // Convert base64 to binary data
      const binaryString = window.atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio blob and URL
      const blob = new Blob([bytes], { type: "audio/mp3" });
      const newAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(newAudioUrl);

      // Auto-play the audio after a short delay
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }, 100);
    },
    [cleanupAudioUrl]
  );

  // Handle the roast response: update state and trigger TTS
  const handleRoastResponse = useCallback(
    async (analysis: string, roastText: string) => {
      setImageAnalysis(analysis);
      setRoast(roastText);

      const ttsResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/tts`,
        { text: roastText }
      );

      await processAudioResponse(ttsResponse.data.audio);
    },
    [processAudioResponse]
  );

  // Error handling utility for API requests
  const handleError = useCallback((err: unknown) => {
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
  }, []);

  // Handle the main roast generation process
  const handleRoast = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      setRoast("");
      setAudioUrl("");

      try {
        // Step 1: Analyze the image
        setLoadingStage("analyzing");
        const analysisFormData = new FormData();
        analysisFormData.append("file", file);
        const analysisResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/analyze`,
          analysisFormData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        const analysis = analysisResponse.data.analysis;

        // Step 2: Generate the roast
        setLoadingStage("judging");
        const judgeResponse = await axios.post(
          `${import.meta.env.VITE_API_URL}/judge`,
          {
            analysis: analysis,
            model: selectedModel,
          }
        );

        // Step 3: Process the roast and generate TTS
        setLoadingStage("roasting");
        await handleRoastResponse(analysis, judgeResponse.data.roast);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
        setLoadingStage("");
      }
    },
    [selectedModel, handleRoastResponse, handleError]
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      cleanupImagePreview();

      setCurrentFile(file);
      setImagePreview(URL.createObjectURL(file));
      await handleRoast(file);
    },
    [handleRoast, cleanupImagePreview]
  );

  const handleReRoast = useCallback(async () => {
    if (!imageAnalysis) return;

    setLoading(true);
    setError("");
    setRoast("");
    setAudioUrl("");

    try {
      setLoadingStage("judging");
      const judgeResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/judge`,
        {
          analysis: imageAnalysis,
          model: selectedModel,
        }
      );

      setLoadingStage("roasting");
      await handleRoastResponse(imageAnalysis, judgeResponse.data.roast);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  }, [imageAnalysis, selectedModel, handleRoastResponse, handleError]);

  const handleShare = useCallback((platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      "Check out this AI roast I got from Scorpius! 🔥"
    );

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    const shareUrl = shareUrls[platform as keyof typeof shareUrls];
    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  }, []);

  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      if (audioRef.current && typeof newValue === "number") {
        audioRef.current.currentTime = newValue;
        setAudioProgress(newValue);
      }
    },
    []
  );

  const formatTime = useMemo(
    () => (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    },
    []
  );

  const handlePopoverOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    },
    []
  );

  const handlePopoverClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

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
          <Tooltip title="Scorpius">
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
          <Tooltip title="CLōD">
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
            sx={commonButtonStyle}
            disabled={loading || !selectedModel}
          >
            {loading
              ? `${
                  loadingStage.charAt(0).toUpperCase() + loadingStage.slice(1)
                }...`
              : "Add Photo"}
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
              sx={commonButtonStyle}
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
              <Typography
                variant="body1"
                sx={{ whiteSpace: "pre-wrap", mt: 2 }}
              >
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
                sx={commonIconButtonStyle}
              >
                <FacebookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on X">
              <IconButton
                onClick={() => handleShare("twitter")}
                sx={commonIconButtonStyle}
              >
                <XIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share on LinkedIn">
              <IconButton
                onClick={() => handleShare("linkedin")}
                sx={commonIconButtonStyle}
              >
                <LinkedInIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Typography
          variant="caption"
          align="center"
          sx={{
            maxWidth: 600,
            color: "rgba(255, 255, 255, 0.6)",
            px: 2,
            fontSize: "0.75rem",
          }}
        >
          Disclaimer: CLōD and its affiliates are not responsible for any
          content generated by this application. The roasts are AI-generated and
          may contain inappropriate or offensive content. Use at your own
          discretion.
        </Typography>
      </Container>
    </ThemeProvider>
  );
}

export default App;
