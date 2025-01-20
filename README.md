# Scorpius: Get Roasted by AI 🔥

> We're [live](https://scorpius.onrender.com/) 🎉

## Overview

Scorpius is a hilarious AI-powered roasting platform that turns your photos into comedy gold. Simply upload a picture of yourself (or someone else - we won't judge), and watch as AI delivers personalized, witty roasts based on what it sees. Whether you're looking for a good laugh, want to roast your friends, or just curious about what AI thinks of your selfie game, Scorpius has got you covered.

## Key Features

- 🔥 AI-powered personalized roasts
- 📸 Quick and easy photo upload
- 🌐 Social sharing integration

## Technical Requirements

- Python 3.8+
- Node.js and npm

## Installation

### Backend Setup

```bash
cd server

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate    # Mac/Linux
# or
venv\Scripts\activate      # Windows

# Install dependencies
pip install -r requirements.txt
```

### API Configuration

1. Get your API keys:

   - [CLōD Console](https://dashboard.clod.io/api-key)
   - [OpenAI Platform](https://platform.openai.com/api-keys)

2. Create `.env` in the `server` directory:

```bash
CLOD_API_KEY="[your-clod-api-key]"
OPENAI_API_KEY="[your-openai-api-key]"
```

3. Create `.env` in the `client` directory:

```bash
REACT_APP_API_URL="http://localhost:8000"
```

### Frontend Setup

```bash
cd client
npm install
```

## Running the Application

### Backend

```bash
cd server
python3 main.py
```

### Frontend

```bash
cd client
npm start
```

Access the application at `http://localhost:3000`

## Open Source

Scorpius is proudly open source! We believe in the power of community-driven development and welcome contributions from developers of all skill levels. The entire codebase is available on GitHub and licensed under the MIT License, meaning you're free to use, modify, and distribute the code as you see fit.

## Contributing

We love contributions! Whether you're fixing bugs, improving documentation, or adding new features, your help is welcome.

1. Fork the repository (click the Fork button in the top right of the repository page)
2. Clone your forked repository (`git clone https://github.com/YOUR_USERNAME/Scorpius.git`)
3. Create your feature branch (`git checkout -b feature/amazing-feature`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request from your fork to the main repository

Some ways you can help:

- Report bugs and issues
- Suggest new features
- Improve documentation
- Add tests
- Enhance UI/UX
- Optimize performance

## License

Scorpius is released under the MIT License. This means you can:

- Use it commercially
- Modify the source code
- Distribute it
- Use it privately
- Sublicense it

The only requirement is that you include the original copyright and license notice in any copy of the software/source.

## Troubleshooting

### Common Issues

- **Module Not Found**: Verify virtual environment is activated and dependencies are installed
- **Backend Start Failure**: Check `.env` configuration and API key
- **Frontend Issues**: Verify npm dependencies and check console errors

## Development Notes

- Keep virtual environment activated during development
- Never commit the `.env` file or expose API keys
- Run tests before submitting PRs
