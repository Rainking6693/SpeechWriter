# Node Project Bootstrap Script
# Run this inside a repo root to set up Node guardrails (ESLint, Prettier, Husky, lint-staged, dotenv)

Write-Host "==> Bootstrapping Node project guardrails..." -ForegroundColor Green

# Ensure package.json exists
if (-not (Test-Path "package.json")) {
  Write-Host "No package.json found. Initializing npm project..."
  npm init -y
}

# Force Node version pin to 20.17.0 (modern LTS supported by lint-staged and others)
"20.17.0" | Out-File -Encoding ascii .nvmrc
Write-Host "Pinned Node version to 20.17.0 in .nvmrc"

# Install devDependencies
Write-Host "Installing ESLint, Prettier, Husky, lint-staged, dotenv-cli..."
npm install -D eslint prettier husky lint-staged dotenv-cli

# Initialize ESLint config if missing
if (-not (Test-Path ".eslintrc.json")) {
  npx eslint --init
}

# Add Prettier config if missing
if (-not (Test-Path ".prettierrc")) {
  @"
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
"@ | Out-File -Encoding utf8 .prettierrc
}

# Add lint-staged + Husky setup
npm set-script prepare "husky install"

if (-not (Test-Path ".husky")) {
  npx husky install
}

if (-not (Test-Path ".husky/pre-commit")) {
  npx husky add .husky/pre-commit "npx lint-staged"
}

# Add lint-staged config into package.json if not present
$pkg = Get-Content package.json | ConvertFrom-Json
if (-not $pkg.'lint-staged') {
  $pkg | Add-Member -MemberType NoteProperty -Name 'lint-staged' -Value @{
    "*.js" = @("eslint --fix", "prettier --write")
    "*.ts" = @("eslint --fix", "prettier --write")
  }
  $pkg | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 package.json
  Write-Host "Added lint-staged config to package.json."
}

Write-Host "==> Node project bootstrap complete. Run 'nvm install 20.17.0 && nvm use 20.17.0' if not already installed." -ForegroundColor Green
