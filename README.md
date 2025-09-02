# SpeechWriter

AI-powered speech writing platform built with Next.js, TypeScript, and Netlify.

## Project Structure

This is a monorepo built with PNPM workspaces:

```
speechwriter/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Netlify Functions API
├── packages/
│   ├── ui/           # Shared UI components
│   └── config/       # Shared configuration and types
├── docs/             # Documentation
└── tools/            # Build tools and scripts
```

## Getting Started

### Prerequisites

- Node.js 20.11.0 or later
- PNPM 8.15.0 or later

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd speechwriter
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Fill in your environment variables in `.env.local`

### Development

Start the development server:
```bash
pnpm dev
```

This will start the Next.js development server at `http://localhost:3000`.

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build all packages for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking
- `pnpm test` - Run tests
- `pnpm clean` - Clean build outputs

### Deployment

This project is configured for deployment on Netlify:

1. Connect your GitHub repository to Netlify
2. Set build command: `pnpm build`
3. Set publish directory: `apps/web/.next`
4. Add environment variables in Netlify dashboard

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Netlify Functions
- **AI**: OpenAI GPT, Anthropic Claude
- **Package Manager**: PNPM
- **Deployment**: Netlify

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.