Security Quickstart for this repo

Mental model:
- SAST: read code (Semgrep)
- Secrets: find leaked keys/tokens (Gitleaks)
- Dynamic negative tests: verify exploit payloads do not execute (Playwright)

What was added:
- .semgrep/rules/gensokyo-security.yml
- .gitleaks.toml
- .github/workflows/security.yml
- playwright.config.js
- tests/security/security.spec.js
- package.json (security scripts)

Run locally (PowerShell):
1) Install Semgrep
   pip install semgrep

2) Run Semgrep
   semgrep scan --config p/owasp-top-ten --config .semgrep/rules

3) Run Gitleaks without Docker (Windows)
   winget install Gitleaks.Gitleaks
   gitleaks dir --source . --config .gitleaks.toml --redact --verbose

4) Install Playwright dependencies
   npm install
   npx playwright install firefox

5) Run negative security tests
   npm run test:security

Nota local:
- En Windows, aunque tengas Firefox instalado, Playwright necesita su propio Firefox parcheado.
- Para evitar Chromium, usa: npx playwright install firefox
- En CI se sigue usando Chromium administrado por Playwright.

Optional: run tests against another local URL
   $env:BASE_URL = "http://localhost:8080"
   npm run test:security

CI behavior:
- On every push and pull request, GitHub Actions runs:
  - Semgrep (OWASP + custom rules)
  - Gitleaks (custom config, no Docker)
  - Playwright negative security suite

Notes:
- If Semgrep reports too many noisy findings, tune the custom rules first.
- Keep the custom rules focused on your real patterns (inline on* interpolation, innerHTML paths, weak IDs).
- The Playwright suite is intentionally exploit-focused: it validates no execution, not only visual correctness.
