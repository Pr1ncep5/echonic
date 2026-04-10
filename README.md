<div align="center">

<video src="https://github.com/user-attachments/assets/5a5e3df1-911c-4d74-a531-ca4bfb79faf7" width="720" autoplay loop muted playsinline></video>

<br />
<br />

<h1>Echonic</h1>

<p>The open-source ElevenLabs alternative.</p>

<p>AI-powered text-to-speech and voice cloning application built with Next.js 16 and the <a href="https://github.com/resemble-ai/chatterbox">Chatterbox model</a>.</p>

<br />

[![Deploy with Railway](https://railway.com/button.svg)](https://railway.com?referralCode=Princeps)

<br />

<p>
  <a href="https://better-auth.com"><img src="https://img.shields.io/badge/Better%20Auth-000000?logo=betterauth&logoColor=white" alt="Better Auth" height="22"></a>
  <a href="https://polar.sh"><img src="https://img.shields.io/badge/Polar-000000?logo=polar&logoColor=white" alt="Polar" height="22"></a>
  <a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?logo=drizzle&logoColor=black" alt="Drizzle ORM" height="22"></a>
  <a href="https://sentry.io"><img src="https://img.shields.io/badge/Sentry-362D59?logo=sentry&logoColor=white" alt="Sentry" height="22"></a>
  <a href="https://coderabbit.ai"><img src="https://img.shields.io/badge/CodeRabbit-FF6C37?logo=rabbitmq&logoColor=white" alt="CodeRabbit" height="22"></a>
</p>

</div>

<br />

## Table of Contents

- [About Echonic](#about-echonic)
- [Key Features](#key-features)
- [Architecture \& Tech Stack](#architecture--tech-stack)
- [Deployment & Monitoring](#deployment--monitoring)
- [Getting Started](#getting-started)
- [Monetization \& Billing](#monetization--billing)
- [Contributing](#contributing)
- [License](#license)

---

## About Echonic

**[Try Echonic Live](https://echonic-production.up.railway.app/)** 🚀

**Echonic** is an open-source, full-stack alternative to platforms like ElevenLabs, designed from the ground up for teams and developers who need a bride variety of voice synthesis within a collaborative environment.

While there are many closed-source AI voice tools available today, some organizations require complete control over their audio infrastructure, predictable usage-based B2B billing, and the ability to integrate custom voice cloning directly into their workflows. Echonic bridges this gap by combining quite powerful, open-source AI (the [Chatterbox model](https://github.com/resemble-ai/chatterbox)) with modern web architecture.

It provides a platform where users can instantly generate lifelike audio, clone custom voices directly within their browser, and centralize all their billing and media in one unified workspace.

### Showcase

<div align="center">
  <video src="https://github.com/user-attachments/assets/cc5985cb-3740-4caa-9e64-74b54ef43e59" width="720" autoplay loop muted playsinline></video>
  <h4>1. Text-to-Speech Workspace</h4>
  <p><i>The central workspace featuring text synthesis.</i></p>

  <br />

<video src="https://github.com/user-attachments/assets/03214f4b-9012-43e4-8eed-dad223246354" width="720" autoplay loop muted playsinline></video>

  <h4>2. Explore Voices</h4>
  <p><i>Discover prebuilt system voices alongside custom, user-generated options.</i></p>

  <br />

<video src="https://github.com/user-attachments/assets/e43eeb45-3da9-4d4c-97fb-3565dea61e11" width="720" autoplay loop muted playsinline></video>

  <h4>3. Voice Cloning Interface</h4>
  <p><i>The intuitive Voice Cloning modal allowing immediate browser recording or audio file upload.</i></p>
</div>

## Key Features

- **Text-to-speech (TTS) generation**: Leverages the open-source _Chatterbox model_ to convert written text into natural audio. You control the output with adjustable creativity and expression parameters, seamlessly outputting standard formats for immediate playback or download.
- **Voice cloning**: Upload an existing audio file or record yourself directly from your browser using the native audio capturing interface (10s minimum). Echonic instantly maps the frequency and tonality of the sample to create a reusable voice model.
- **Organization-level workspaces**: Built on a fully multi-tenant architecture to support collaborative workflows using Better Auth. Users can create teams and securely share custom-cloned voices and generation history logs across the entire organization.
- **Pay-as-you-go billing**: Secure, usage-based B2B billing strictly tied to your workspace using [Polar](https://polar.sh). Start generating using checkouts and dedicated customer portals. Echonic features real-time backend metering, tracking the exact character count of every generation to ensure fair pricing.
- **Robust audio infrastructure**: Audio generations and custom voice samples are securely uploaded to and streamed directly from [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) object storage. You can also browse and replay past generations dynamically through a rich WaveSurfer.js waveform audio player.
- **Modern app experience**: A highly responsive, mobile-first UI built on the server-rendered Next.js 16 App Router. Designed with React, Tailwind CSS, and Shadcn UI, it delivers an accessible user experience complete with bottom drawers, compact controls, and adaptive layouts.

## Architecture & Tech Stack

### Architecture

Echonic relies on the following architecture separating the user-facing web server, the billing provider, and the distributed storage.

<div align="center">
  <img src="https://github.com/user-attachments/assets/f9508939-1152-4189-9e16-4d7772fd32ba" alt="Backend Infrastructure Diagram" />
  <p><i>The core backend orchestrating Better Auth, tRPC + Drizzle ORM, Cloudflare R2 Storage, and Polar billing.</i></p>
</div>

### Tech Stack

Echonic leverages a cutting-edge, type-safe ecosystem to guarantee smooth DX.

- **Framework**: Next.js 16 (App Router, React 19)
- **API Network**: tRPC
- **Database ORM**: Drizzle ORM
- **Authentication**: Better Auth
- **Styling & Components**: Tailwind CSS, TanStack, Shadcn UI
- **Hardware Integration**: Web Audio API & WaveSurfer.js

#### 1. The Security & Billing Layer

Every API operation is strictly typed end-to-end via **tRPC**. When a user attempts to generate text-to-speech or clone a voice, the `orgProcedure` middleware intercepts the request:
1. It extracts the session context from **Better Auth** to determine the current Workspace (`orgId`).
2. It verifies that `orgId` against the **Polar** billing server in real-time. 
3. If the organization lacks an active subscription, the request is rejected as `UNAUTHORIZED`. 
4. If validated, the operation proceeds to process the audio, and the usage metrics (character counts or cloning events) are securely ingested to Polar. This ensures zero manipulation of character limits from the frontend.

#### 2. Self-Hosting

Echonic is designed to be completely self-hosted. You will need:

- **A PostgreSQL database** – Any managed Postgres instance.
- **Better Auth** – For native, customizable authentication and multi-tenant organizational structure.
- **Cloudflare R2** – For secure audio storage (S3-compatible, generous free tier!).
- **Modal** – For serverless GPU inference of the TTS engine (pay-per-second deployment).
- **Polar** – For B2B metered billing (you can use the Sandbox mode with card `4242 4242 4242 4242` for frictionless local testing).

<div align="center">
  <img src="https://github.com/user-attachments/assets/87340c67-850d-44d5-b8d0-d37aa34c56cb" alt="Data Flow" />
  <p><i>The optimized streaming flow using Modal.</i></p>
</div>

1. The Next.js remote API validates the payload and proxies a request to the self-hosted **Chatterbox** AI server running on **Modal**.
2. The GPU leverages the tensor model to generate the resulting `.wav` audio.
3. Instead of streaming the heavy audio payload back through the Node.js server, the model saves the asset directly to **Cloudflare R2** and returns a reference ID.
4. The frontend client receives a highly-optimized, secure Signed URL linked directly to R2 for rapid playback across edge locations.

## Deployment & Monitoring

You can easily deploy the Next.js application to any Node.js host (like Railway, Vercel, or a custom VPS).

- I decided to deploy this project on [Railway](https://railway.app/) because we have no cold starts, no surprise serverless bills, no AWS wrapper adding markup. They run on their own hardware, and we can use their CI/CD pipeline to deploy the application automatically. Every PR can get its own preview deployment, so nothing hits production untested.  
- I use [BetterAuth Infrastructure](https://better-auth.com/products/infrastructure) as well as [Sentry](https://sentry.io/) for error monitoring. These services allow me to monitor the application's performance, logs and generally provide a much better developer experience while working.
- [CodeRabbit](https://coderabbit.ai/) for code reviews. It can generate PRs, suggest improvements, and generally help with the development process, catching bugs and security vulnerabilities before they hit production.  

## Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:

- [Bun](https://bun.sh/)
- PostgreSQL (local installation or a hosted provider)

### 1. Clone the Repository & Install Dependencies

```bash
git clone https://github.com/Pr1ncep5/echonic.git
cd echonic
bun install
```

### 2. Environment Setup

Create a `.env` file in the root directory. You must configure the following key services to run the project fully:

- **Better Auth**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- **PostgreSQL Database connection**: `DATABASE_URL`
- **Cloudflare R2**: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Chatterbox**: `CHATTERBOX_API_KEY`, `CHATTERBOX_API_URL`
- **Polar Billing**: `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`
- **Sentry Logging**: `SENTRY_AUTH_TOKEN`, `SENTRY_DSN`
- **OAuth Providers (Optional)**: GitHub and Google Client IDs/Secrets

_(Refer to `src/lib/env.ts` for the exact Zod schema and validation rules)._

### 3. Deploy the TTS Engine

Echonic relies on a serverless GPU to generate speech and clone voices using the Chatterbox model.

You must deploy the [Chatterbox SDK](https://modal.com/docs/examples/chatterbox_tts) to a GPU provider (e.g., via Modal) and copy your resulting endpoint URL into your `.env` as `CHATTERBOX_API_URL`.

Once your GPU endpoint is live, synchronize the strictly typed API schema for the frontend:

```bash
bun run sync-api
```

### 4. Set up Polar Billing

To securely meter organizational usage, log into your [Polar](https://polar.sh) dashboard and configure the event rules:

1. Create two **Meters**:
   - **Voice Creation**: Filter _Name equals `voice_creation`_ (Aggregation: Count)
   - **Text-to-Speech Characters**: Filter _Name equals `tts_generation`_ (Aggregation: Sum over `characters`)

2. Create a **Product** (Recurring Subscription). Under **Price Type**, inject your two metered prices:
   - _Text-to-Speech Characters_: Set an Amount per unit (e.g., `€0.003`)
   - _Voice Creation_: Set an Amount per unit (e.g., `€0.20`)

3. Copy the resulting Product ID into your `.env` as `POLAR_PRODUCT_ID`.

### 5. Database Initialization

Push the Drizzle ORM schema to your target PostgreSQL database:

```bash
bunx drizzle-kit push
```

Next, run the seed script to populate the prebuilt Chatterbox system voices:

```bash
bun run db:seed
```

### 6. Start the Development Server

```bash
bun dev
```

The application will now be available at `http://localhost:3000`.

## Monetization & Billing

Echonic is engineered as a fully functional B2B SaaS, featuring a robust **pay-as-you-go** billing architecture powered securely by [Polar](https://polar.sh/).

Instead of locking organizations into rigid monthly tiers that they might never fully utilize, the platform strictly meters actual usage via serverless event ingestion:

- **TTS Generation**: Organizations are charged exactly based on the volume of characters they synthesize into actual audio (€0.003 per character).
- **Voice Cloning**: A nominal flat rate of €0.20 is incurred whenever an organization trains and uploads a new custom voice model.

### Centralized Organization Billing

Because Echonic is built on Better Auth's multi-tenant architecture, Polar Customers are directly mapped to the **workspace** instead of individual users. This means an entire creative department can collaboratively generate audio and clone voices, seamlessly pooling their usage onto a single automated company invoice.

At any time, members can navigate to their organization settings and launch the Polar Customer Portal to view real-time usage meters, manage payment methods, and download receipts—all without needing to build a custom billing UI.

<div align="center">
  <img src="https://github.com/user-attachments/assets/5fb2457b-545c-481b-8ab2-8cf89af7ad53" alt="Polar Billing Portal" width="720" />
  <p><i>The transparent billing dashboard provided by Polar.</i></p>
</div>

## Contributing

Any contributions you make to Echonic are highly appreciated!

If you have a workflow improvement, a bug fix, or a new feature idea (e.g. integrating a new AI model), please fork the repo and create a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazingFeature`)
3. Commit your Changes (`git commit -m 'Add some amazingFeature'`)
4. Push to the Branch (`git push origin feature/amazingFeature`)
5. Open a Pull Request

You can also simply [open an Issue](https://github.com/Pr1ncep5/echonic/issues) with the tag "enhancement" to discuss an idea before building it ^^

## License

This project is licensed under the [MIT License](LICENSE).

### Acknowledgements

- A special thanks to [Code with Antonio](https://www.youtube.com/@codewithantonio) for the original idea and layout inspiration behind this application. While Echonic has been re-engineered with a different technology stack (using Better Auth and Drizzle ORM) and features custom functionality, the core foundation and aesthetic inspiration stem entirely from his excellent educational content.
- [Chatterbox TTS](https://github.com/resemble-ai/chatterbox) by Resemble AI - the open-source zero-shot voice cloning model powering speech generation
- [Modal](https://modal.com/docs/examples/chatterbox_tts) - serverless GPU deployment example and [voice sample pack](https://modal-cdn.com/blog/audio/chatterbox-tts-voices.zip)
