# Nazeem Enterprise Platform

Welcome to the Nazeem Enterprise Platform! This project is designed to provide an intelligent diagnostic system for organizations, enabling them to identify and solve critical coordination problems within their departments.

## Features

- **Admin Account Creation**: Admins can create an organization account and invite department heads.
- **AI-Powered Diagnostic Chat**: Department heads can engage in a chat to diagnose their workflows and identify key issues.
- **Workflow Analysis**: The system analyzes responses to determine the most pressing problems and generates reports ranking workflows by value.
- **Final Reporting**: Admins can generate comprehensive reports that summarize findings and suggest actionable steps.

## Project Structure

The project is organized as follows:

```
nazeem-enterprise-platform
├── src
│   ├── app
│   │   ├── auth
│   │   │   └── admin-signup
│   │   │       └── page.tsx
│   │   ├── admin
│   │   │   ├── dashboard
│   │   │   │   └── page.tsx
│   │   │   └── report
│   │   │       └── page.tsx
│   │   ├── department
│   │   │   ├── diagnostic
│   │   │   │   └── [id]
│   │   │   │       └── page.tsx
│   │   │   └── results
│   │   │       └── [id]
│   │   │           └── page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components
│   │   └── ui
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── textarea.tsx
│   │       └── progress.tsx
│   └── lib
│       ├── supabase.ts
│       ├── llm.ts
│       └── utils.ts
├── public
│   └── .gitkeep
├── supabase
│   └── migrations
│       └── 001_initial_schema.sql
├── .env.local
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/nazeem-enterprise-platform.git
   ```

2. Navigate to the project directory:
   ```
   cd nazeem-enterprise-platform
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Set up your environment variables:
   - Create a `.env.local` file in the root directory and add your Supabase and OpenAI API keys:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     OPENAI_API_KEY=your_openai_api_key
     ```

### Running the Project

To start the development server, run:
```
npm run dev
```

You can now access the application at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.