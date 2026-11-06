# Contributing to CineCast TV

Contributions, feature suggestions, and bug reports are welcome!

---

## 1. Code of Conduct

- Be respectful, constructive, and collaborative.
- Respect copyright and platform terms of service. Do not submit PRs attempting to bypass access controls or DRM.

---

## 2. Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/personal-video-downloader.git
   cd personal-video-downloader
   ```
2. Set up Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Or .venv\Scripts\Activate.ps1 on Windows
   pip install -r requirements.txt
   ```
3. Set up Frontend:
   ```bash
   cd frontend
   npm install
   cd ..
   ```
4. Run in dev mode:
   - Backend: `python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload`
   - Frontend: `cd frontend && npm run dev`

---

## 3. Running Tests Before Submitting

Always ensure backend unit tests and frontend type-checks pass:

```powershell
# Run backend tests
python -m unittest backend/tests/test_units.py

# Run frontend typecheck & build
cd frontend
npx tsc --noEmit
npm run build
```

---

## 4. Submitting Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feature/tv-codec-profile-update
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(media): add support for AC3 audio stream passthrough"
   ```
3. Push to your fork and submit a Pull Request against the `main` branch.
