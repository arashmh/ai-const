
# AI Constitution Simulator

An interactive web application that creates societies of AI agents with distinct ethical and cognitive profiles, then simulates the emergence of constitutional law through democratic processes. Watch as AI citizens propose, debate, and ratify laws in a digital democracy.

## What This Project Does

The AI Constitution Simulator allows you to:

### 1. **Create AI Societies**
- Build diverse digital societies by creating AI members with unique cognitive and ethical profiles
- Use a detailed questionnaire system to craft individual AI agents with specific worldviews, moral frameworks, and decision-making patterns
- Generate bulk members from predefined archetypes (conservatives, progressives, libertarians, etc.)
- Each AI agent has multi-dimensional personality traits including social/political leanings, risk tolerance, communication styles, and more

### 2. **Run Constitutional Experiments**
- Launch experiments where AI agents autonomously participate in a constitutional convention
- AI citizens identify societal issues, propose new laws, and engage in democratic processes
- Observe emergent governance structures as agents advance through roles:
  - **Citizens**: Identify issues, vote on proposals, suggest modifications
  - **Drafters**: Write formal legal text for approved issues
  - **Reviewers**: Evaluate and comment on proposed legislation
- Laws are ratified through structured review periods and democratic approval processes

### 3. **Observe Democratic Processes**
- Real-time event logging shows every action agents take
- Track proposal lifecycles from initial issues through to ratified constitutional law
- Monitor voting patterns, debates, and the evolution of legal frameworks
- See how different personality types interact and influence legislative outcomes

## Key Features

- **Autonomous AI Agents**: Each member acts independently based on their cognitive profile
- **Multi-Stage Legislative Process**: Issues → Drafting → Review → Ratification
- **Role-Based Participation**: Meritocratic advancement system for active participants  
- **Real-Time Simulation**: Watch democracy unfold with configurable pacing
- **Persistent Storage**: Societies and experiments are saved locally
- **Interactive Interface**: Manage multiple societies and run parallel experiments

## Technical Architecture

- **Frontend**: React with TypeScript, styled with Tailwind CSS
- **AI Integration**: Google Gemini API for agent cognition and decision-making
- **State Management**: React hooks with localStorage persistence
- **Simulation Engine**: Turn-based system with configurable parameters
- **Profile System**: Multi-dimensional personality modeling for realistic agent behavior

## Getting Started

### Prerequisites
- Node.js
- A Gemini API key

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your `GEMINI_API_KEY` in the environment or `.env.local` file

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## How It Works

1. **Society Creation**: Start by creating a digital society. Use the questionnaire to craft founding members with diverse viewpoints, or bulk-generate from archetypes.

2. **Experiment Launch**: Select society members for a constitutional experiment. Configure parameters like actions per day, review periods, and promotion thresholds.

3. **Democratic Simulation**: AI agents autonomously:
   - Identify societal grievances needing legal solutions
   - Propose and vote on new laws
   - Draft formal constitutional text
   - Review and debate proposals
   - Ratify approved laws into the constitution

4. **Observation**: Monitor the real-time event log, track proposal statuses, and watch as a constitutional framework emerges from the collective actions of your AI society.

## Use Cases

- **Political Science Research**: Study how different ideological compositions affect constitutional development
- **AI Behavior Analysis**: Observe emergent behaviors in multi-agent democratic systems  
- **Educational Tool**: Visualize how democratic institutions and legal systems evolve
- **Game/Simulation**: Engage with an interactive model of society formation and governance

The AI Constitution Simulator bridges artificial intelligence, political science, and interactive simulation to create a unique window into democratic processes and constitutional emergence.
