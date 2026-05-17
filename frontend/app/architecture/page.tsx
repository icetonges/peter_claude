'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── DATA ────────────────────────────────────────────────────────────────────

const TOOLS = [
  { name: 'AgentTool', cat: 'Agents', desc: 'Spawn sub-agents for complex tasks' },
  { name: 'SendMessageTool', cat: 'Agents', desc: 'Send messages between agents' },
  { name: 'TaskCreateTool', cat: 'Tasks', desc: 'Create tracked task items' },
  { name: 'TaskUpdateTool', cat: 'Tasks', desc: 'Update task status & details' },
  { name: 'TaskGetTool', cat: 'Tasks', desc: 'Retrieve task state' },
  { name: 'TaskListTool', cat: 'Tasks', desc: 'List all active tasks' },
  { name: 'TaskStopTool', cat: 'Tasks', desc: 'Halt a running task' },
  { name: 'TaskOutputTool', cat: 'Tasks', desc: 'Read task output stream' },
  { name: 'BashTool', cat: 'Shell', desc: 'Execute shell commands in sandbox' },
  { name: 'PowerShellTool', cat: 'Shell', desc: 'Run PowerShell on Windows' },
  { name: 'REPLTool', cat: 'Shell', desc: 'Interactive REPL sessions' },
  { name: 'FileReadTool', cat: 'Files', desc: 'Read files from filesystem' },
  { name: 'FileEditTool', cat: 'Files', desc: 'Make targeted file edits' },
  { name: 'FileWriteTool', cat: 'Files', desc: 'Write/create files' },
  { name: 'GlobTool', cat: 'Files', desc: 'Pattern-match file paths' },
  { name: 'GrepTool', cat: 'Files', desc: 'Search file contents with regex' },
  { name: 'NotebookEditTool', cat: 'Files', desc: 'Edit Jupyter notebooks' },
  { name: 'WebFetchTool', cat: 'Web', desc: 'Fetch web pages as text/HTML' },
  { name: 'WebSearchTool', cat: 'Web', desc: 'Search the web via API' },
  { name: 'MCPTool', cat: 'MCP', desc: 'Invoke MCP server tools' },
  { name: 'McpAuthTool', cat: 'MCP', desc: 'Handle MCP OAuth flows' },
  { name: 'ListMcpResourcesTool', cat: 'MCP', desc: 'List resources from MCP servers' },
  { name: 'ReadMcpResourceTool', cat: 'MCP', desc: 'Read a specific MCP resource' },
  { name: 'SkillTool', cat: 'Skills', desc: 'Load and invoke skill definitions' },
  { name: 'ToolSearchTool', cat: 'Skills', desc: 'Discover deferred tools by query' },
  { name: 'EnterPlanModeTool', cat: 'Planning', desc: 'Enter plan-before-act mode' },
  { name: 'ExitPlanModeTool', cat: 'Planning', desc: 'Exit plan mode, execute plan' },
  { name: 'EnterWorktreeTool', cat: 'Planning', desc: 'Isolate work in git worktree' },
  { name: 'ExitWorktreeTool', cat: 'Planning', desc: 'Merge worktree back' },
  { name: 'WorkflowTool', cat: 'Planning', desc: 'Run multi-step workflow scripts' },
  { name: 'ScheduleCronTool', cat: 'Automation', desc: 'Schedule recurring cron tasks' },
  { name: 'RemoteTriggerTool', cat: 'Automation', desc: 'Trigger remote agent actions' },
  { name: 'SleepTool', cat: 'Automation', desc: 'Pause execution for N seconds' },
  { name: 'LSPTool', cat: 'Dev', desc: 'Query Language Server Protocol' },
  { name: 'ConfigTool', cat: 'Dev', desc: 'Read/write Claude config' },
  { name: 'BriefTool', cat: 'Dev', desc: 'Generate task brief summaries' },
  { name: 'TodoWriteTool', cat: 'Dev', desc: 'Manage TODO list items' },
  { name: 'TeamCreateTool', cat: 'Teams', desc: 'Create agent teams' },
  { name: 'TeamDeleteTool', cat: 'Teams', desc: 'Remove agent teams' },
  { name: 'TungstenTool', cat: 'Internal', desc: 'Internal Anthropic tooling bridge' },
  { name: 'SyntheticOutputTool', cat: 'Internal', desc: 'Generate synthetic outputs for testing' },
  { name: 'AskUserQuestionTool', cat: 'UX', desc: 'Ask user structured questions' },
]

const SUBAGENTS = [
  {
    name: 'general-purpose',
    file: 'generalPurposeAgent.ts',
    desc: 'Research, multi-step tasks, open-ended analysis across codebase',
    tools: ['All tools'],
    color: '#6366f1',
  },
  {
    name: 'Explore',
    file: 'exploreAgent.ts',
    desc: 'Fast read-only search — find files by pattern, grep symbols, locate definitions',
    tools: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
    color: '#0ea5e9',
  },
  {
    name: 'Plan',
    file: 'planAgent.ts',
    desc: 'Software architect for designing implementation plans and step-by-step strategies',
    tools: ['All except Agent, ExitPlanMode, Edit, Write, NotebookEdit'],
    color: '#8b5cf6',
  },
  {
    name: 'claude-code-guide',
    file: 'claudeCodeGuideAgent.ts',
    desc: 'Answers questions about Claude Code CLI, Agent SDK, and Anthropic API',
    tools: ['Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch'],
    color: '#f59e0b',
  },
  {
    name: 'statusline-setup',
    file: 'statuslineSetup.ts',
    desc: 'Configures the Claude Code status line setting by reading shell configs',
    tools: ['Read', 'Edit'],
    color: '#10b981',
  },
  {
    name: 'Verification',
    file: 'verificationAgent.ts',
    desc: 'Tries to break implementations — runs builds, tests, linters for PASS/FAIL verdict',
    tools: ['Bash', 'WebFetch', 'FileEdit', 'FileWrite', 'NotebookEdit', 'Agent'],
    color: '#ef4444',
  },
]

const SKILLS = [
  { name: 'batch', desc: 'Run multiple operations in parallel batches' },
  { name: 'claudeApi', desc: 'Call Claude API directly from skill context' },
  { name: 'claudeApiContent', desc: 'Process Claude API content blocks' },
  { name: 'claudeInChrome', desc: 'Control Chrome browser via Claude' },
  { name: 'debug', desc: 'Debug tool call failures and errors' },
  { name: 'keybindings', desc: 'Configure and manage keybindings' },
  { name: 'loop', desc: 'Repeat tasks in a structured loop' },
  { name: 'remember', desc: 'Persist facts to memory system' },
  { name: 'scheduleRemoteAgents', desc: 'Schedule agents to run remotely' },
  { name: 'simplify', desc: 'Simplify complex prompts and responses' },
  { name: 'skillify', desc: 'Convert prompts into reusable skills' },
  { name: 'stuck', desc: 'Escape stuck loops with recovery strategies' },
  { name: 'updateConfig', desc: 'Update Claude configuration settings' },
  { name: 'verify', desc: 'Verify task completion correctness' },
  { name: 'verifyContent', desc: 'Verify content accuracy and quality' },
]

const MODELS = [
  { key: 'haiku35', id: 'claude-3-5-haiku-20241022', gen: 'Gen 3', tier: 'Fast' },
  { key: 'haiku45', id: 'claude-haiku-4-5-20251001', gen: 'Gen 4', tier: 'Fast' },
  { key: 'sonnet35', id: 'claude-3-5-sonnet-20241022', gen: 'Gen 3', tier: 'Balanced' },
  { key: 'sonnet37', id: 'claude-3-7-sonnet-20250219', gen: 'Gen 3.7', tier: 'Balanced' },
  { key: 'sonnet40', id: 'claude-sonnet-4-20250514', gen: 'Gen 4', tier: 'Balanced' },
  { key: 'sonnet45', id: 'claude-sonnet-4-5-20250929', gen: 'Gen 4.5', tier: 'Balanced' },
  { key: 'sonnet46', id: 'claude-sonnet-4-6', gen: 'Gen 4.6', tier: 'Balanced' },
  { key: 'opus40', id: 'claude-opus-4-20250514', gen: 'Gen 4', tier: 'Powerful' },
  { key: 'opus41', id: 'claude-opus-4-1-20250805', gen: 'Gen 4.1', tier: 'Powerful' },
  { key: 'opus45', id: 'claude-opus-4-5-20251101', gen: 'Gen 4.5', tier: 'Powerful' },
  { key: 'opus46', id: 'claude-opus-4-6', gen: 'Gen 4.6', tier: 'Powerful' },
]

const PROVIDERS = [
  { id: 'firstParty', label: 'Anthropic API', env: 'default', endpoint: 'api.anthropic.com', color: '#c85a3a' },
  { id: 'bedrock', label: 'AWS Bedrock', env: 'CLAUDE_CODE_USE_BEDROCK=1', endpoint: 'us.anthropic.*', color: '#f59e0b' },
  { id: 'vertex', label: 'Google Vertex', env: 'CLAUDE_CODE_USE_VERTEX=1', endpoint: 'vertex.ai/*', color: '#3b82f6' },
  { id: 'foundry', label: 'Azure Foundry', env: 'CLAUDE_CODE_USE_FOUNDRY=1', endpoint: 'azure.*', color: '#8b5cf6' },
]

const SOURCE_DIRS = [
  { name: 'src/tools/', count: 42, desc: 'Built-in tools (AgentTool, BashTool, FileEditTool…)' },
  { name: 'src/commands/', count: 101, desc: 'CLI slash commands (/model, /mcp, /skills…)' },
  { name: 'src/components/', count: 148, desc: 'React/Ink terminal UI components' },
  { name: 'src/bridge/', count: 33, desc: 'Remote session bridge & transport layer' },
  { name: 'src/services/', count: 86, desc: 'MCP, OAuth, analytics, memory, LSP services' },
  { name: 'src/skills/bundled/', count: 15, desc: 'Built-in skill definitions (verify, batch, loop…)' },
  { name: 'src/tasks/', count: 8, desc: 'Task execution models (LocalAgent, RemoteAgent…)' },
  { name: 'src/utils/', count: 312, desc: 'Utilities: model, settings, git, permissions…' },
  { name: 'src/cli/', count: 24, desc: 'CLI entrypoint, transports (SSE, WS, HybridTransport)' },
  { name: 'src/types/', count: 38, desc: 'Generated protobuf types & schemas' },
]

const STORAGE_LAYERS = [
  {
    label: 'userSettings',
    path: '~/.claude/settings.json',
    scope: 'Global',
    desc: 'Model preference, permissions, MCP servers, theme',
    color: '#6366f1',
  },
  {
    label: 'projectSettings',
    path: '.claude/settings.json',
    scope: 'Project (shared)',
    desc: 'Project-wide rules, allow/deny lists, hooks',
    color: '#0ea5e9',
  },
  {
    label: 'localSettings',
    path: '.claude/settings.local.json',
    scope: 'Project (gitignored)',
    desc: 'Personal overrides not shared with teammates',
    color: '#10b981',
  },
  {
    label: 'flagSettings',
    path: '--settings <path>',
    scope: 'Session',
    desc: 'One-off overrides passed at CLI startup',
    color: '#f59e0b',
  },
  {
    label: 'policySettings',
    path: 'managed-settings.json',
    scope: 'Org / MDM',
    desc: 'Admin-enforced policies via MDM or remote API',
    color: '#ef4444',
  },
]

const FRONTEND_COMPONENTS = [
  {
    name: 'app/page.tsx',
    role: 'Root',
    desc: 'Mounts Sidebar + ChatView, manages all conversation state, persists to localStorage',
    deps: ['Sidebar', 'ChatView', 'lib/store'],
  },
  {
    name: 'components/Sidebar.tsx',
    role: 'Navigation',
    desc: 'Conversation list grouped by date, delete, collapse toggle, total cost footer',
    deps: ['lib/store', 'lib/types'],
  },
  {
    name: 'components/ChatView.tsx',
    role: 'Core UI',
    desc: 'Drives streaming fetch to /api/chat, renders messages, typing indicator, starter prompts',
    deps: ['MessageBubble', 'MessageInput', 'TokenBadge'],
  },
  {
    name: 'components/MessageBubble.tsx',
    role: 'Display',
    desc: 'Renders user/assistant messages — Markdown, syntax highlighting, code copy, image previews',
    deps: ['react-markdown', 'react-syntax-highlighter', 'TokenBadge'],
  },
  {
    name: 'components/MessageInput.tsx',
    role: 'Input',
    desc: 'Auto-resize textarea, file/image drag-drop, attachment previews, Shift+Enter newline',
    deps: ['ModelSelector', 'lib/types'],
  },
  {
    name: 'components/ModelSelector.tsx',
    role: 'Config',
    desc: 'Dropdown showing model name, description, and live per-million-token pricing',
    deps: ['lib/types'],
  },
  {
    name: 'components/TokenBadge.tsx',
    role: 'Stats',
    desc: 'Shows token count (in+out) and USD cost for each response or cumulative session',
    deps: ['lib/store', 'lib/types'],
  },
  {
    name: 'app/api/chat/route.ts',
    role: 'API',
    desc: 'Server-side streaming route — proxies to Anthropic SDK, hides API key, streams NDJSON chunks',
    deps: ['@anthropic-ai/sdk'],
  },
  {
    name: 'lib/types.ts',
    role: 'Types',
    desc: 'Shared TypeScript types: ModelId, Message, Conversation, Attachment, TokenUsage',
    deps: [],
  },
  {
    name: 'lib/store.ts',
    role: 'State',
    desc: 'localStorage read/write, conversation factory, cost calculations, title generation',
    deps: ['lib/types'],
  },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Agents: '#6366f1', Tasks: '#0ea5e9', Shell: '#f59e0b', Files: '#10b981',
  Web: '#3b82f6', MCP: '#8b5cf6', Skills: '#c85a3a', Planning: '#ec4899',
  Automation: '#14b8a6', Dev: '#84cc16', Teams: '#f97316', Internal: '#6b7280', UX: '#a78bfa',
}

const TIER_COLORS: Record<string, string> = {
  Fast: '#10b981', Balanced: '#3b82f6', Powerful: '#8b5cf6',
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'stack', label: '⚙️ Tech Stack' },
  { id: 'frontend', label: '🖥️ Frontend' },
  { id: 'storage', label: '🗄️ Storage' },
  { id: 'models', label: '🤖 Models' },
]

// ─── SECTIONS ─────────────────────────────────────────────────────────────────

function StackSection() {
  const [toolFilter, setToolFilter] = useState('All')
  const cats = ['All', ...Array.from(new Set(TOOLS.map(t => t.cat)))]
  const filtered = toolFilter === 'All' ? TOOLS : TOOLS.filter(t => t.cat === toolFilter)

  return (
    <div className="space-y-10">

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Source Files', value: '1,916', sub: 'TypeScript + React' },
          { label: 'Built-in Tools', value: '42', sub: 'Across 13 categories' },
          { label: 'CLI Commands', value: '101', sub: '/model, /mcp, /skills…' },
          { label: 'Built-in Skills', value: '15', sub: 'verify, batch, loop…' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
            <div className="text-3xl font-bold text-[var(--accent)]">{s.value}</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{s.label}</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Core dependencies */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Core Dependencies</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Bun', role: 'Runtime & bundler', version: 'v1.x', color: '#f5a623' },
            { name: 'TypeScript', role: 'Primary language', version: '^5', color: '#3178c6' },
            { name: '@anthropic-ai/sdk', role: 'LLM API client', version: '^0.80', color: '#c85a3a' },
            { name: '@modelcontextprotocol/sdk', role: 'MCP server integration', version: '^1.29', color: '#6366f1' },
            { name: 'React 19 + Ink', role: 'Terminal UI renderer', version: '^19 / ^6.8', color: '#61dafb' },
            { name: 'Zod v4', role: 'Schema validation', version: '^4.3', color: '#0ea5e9' },
            { name: 'Commander.js', role: 'CLI argument parsing', version: '^14', color: '#84cc16' },
            { name: 'OpenTelemetry', role: 'Tracing & metrics', version: '^2.x', color: '#f59e0b' },
            { name: 'GrowthBook', role: 'Feature flags / A/B', version: '^1.6', color: '#10b981' },
          ].map(d => (
            <div key={d.name} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <div className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{d.name}</div>
                <div className="text-xs text-[var(--text-secondary)]">{d.role}</div>
                <div className="text-[10px] text-[var(--text-tertiary)] font-mono mt-0.5">{d.version}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source dirs */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Source Structure</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {SOURCE_DIRS.map((d, i) => (
            <div key={d.name} className={`flex items-center gap-4 px-5 py-3 ${i !== SOURCE_DIRS.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <code className="text-xs font-mono text-[var(--accent)] w-44 flex-shrink-0">{d.name}</code>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] truncate">{d.desc}</div>
              </div>
              <div className="text-xs font-semibold text-[var(--text-tertiary)] flex-shrink-0">{d.count} files</div>
              <div className="w-24 h-1.5 rounded-full bg-[var(--surface-hover)] flex-shrink-0 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (d.count / 312) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Built-in Tools ({TOOLS.length})</h3>
          <div className="flex flex-wrap gap-1">
            {cats.map(c => (
              <button
                key={c}
                onClick={() => setToolFilter(c)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${toolFilter === c ? 'text-white' : 'text-[var(--text-secondary)] bg-[var(--surface-hover)] hover:bg-[var(--border)]'}`}
                style={toolFilter === c ? { backgroundColor: CAT_COLORS[c] ?? '#c85a3a' } : {}}
              >{c}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map(t => (
            <div key={t.name} className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[t.cat] ?? '#888' }} />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] font-mono">{t.name}</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Bundled Skills (src/skills/bundled/) — {SKILLS.length} files</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SKILLS.map(s => (
            <div key={s.name} className="flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
              <div className="mt-1 w-2 h-2 rounded-full bg-[var(--accent)] flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] font-mono">{s.name}.ts</div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-agents */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Built-in Sub-agents (src/tools/AgentTool/built-in/) — {SUBAGENTS.length} agents</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SUBAGENTS.map(a => (
            <div key={a.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-sm font-semibold text-[var(--text-primary)]">{a.name}</span>
                <code className="ml-auto text-[10px] font-mono text-[var(--text-tertiary)]">{a.file}</code>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">{a.desc}</p>
              <div className="flex flex-wrap gap-1">
                {a.tools.map(t => (
                  <span key={t} className="rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)] font-mono">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task types */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Task Execution Models (src/tasks/)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'LocalAgentTask', desc: 'Runs a sub-agent in the local process with full tool access' },
            { name: 'RemoteAgentTask', desc: 'Spawns an agent on a remote Anthropic worker node' },
            { name: 'LocalShellTask', desc: 'Executes shell commands in the sandboxed bash environment' },
            { name: 'InProcessTeammateTask', desc: 'In-process teammate for collaborative multi-agent work' },
            { name: 'DreamTask', desc: 'Background dream/auto-mode task that runs without user prompting' },
            { name: 'LocalMainSessionTask', desc: 'The primary conversation session task (main loop)' },
          ].map(t => (
            <div key={t.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="text-xs font-semibold font-mono text-[var(--accent)] mb-1">{t.name}</div>
              <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FrontendSection() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="space-y-10">

      {/* Architecture diagram */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-4">Request Flow</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex flex-col items-center gap-2">
            {/* Browser */}
            <div className="w-full max-w-lg">
              <div className="rounded-xl border-2 border-[#6366f1] bg-[#6366f1]/10 p-4 text-center">
                <div className="text-xs font-semibold text-[#6366f1] uppercase tracking-wider mb-1">Browser (peterclaude.vercel.app)</div>
                <div className="flex justify-center gap-4 text-[11px] text-[var(--text-secondary)]">
                  <span>📋 Sidebar</span>
                  <span>💬 ChatView</span>
                  <span>⌨️ MessageInput</span>
                  <span>🏷️ TokenBadge</span>
                </div>
              </div>
            </div>

            <Arrow label="POST /api/chat (streaming fetch)" />

            {/* Next.js API */}
            <div className="w-full max-w-lg">
              <div className="rounded-xl border-2 border-[#0ea5e9] bg-[#0ea5e9]/10 p-4 text-center">
                <div className="text-xs font-semibold text-[#0ea5e9] uppercase tracking-wider mb-1">Next.js API Route (Vercel Edge)</div>
                <div className="text-[11px] text-[var(--text-secondary)]">app/api/chat/route.ts · hides API key · streams NDJSON</div>
              </div>
            </div>

            <Arrow label="@anthropic-ai/sdk · streaming=true" />

            {/* Anthropic */}
            <div className="w-full max-w-lg">
              <div className="rounded-xl border-2 border-[#c85a3a] bg-[#c85a3a]/10 p-4 text-center">
                <div className="text-xs font-semibold text-[#c85a3a] uppercase tracking-wider mb-1">Anthropic API (api.anthropic.com)</div>
                <div className="flex justify-center gap-4 text-[11px] text-[var(--text-secondary)]">
                  <span>claude-opus-4-6</span>
                  <span>claude-sonnet-4-6</span>
                  <span>claude-haiku-4-5</span>
                </div>
              </div>
            </div>

            <Arrow label="Streamed text_delta events" reverse />

            <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-center">
              <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                {'{ "type": "text", "text": "..." }'}<br />
                {'{ "type": "usage", "usage": { inputTokens: N, outputTokens: N } }'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Components ({FRONTEND_COMPONENTS.length} files) — click to expand</h3>
        <div className="space-y-2">
          {FRONTEND_COMPONENTS.map(c => (
            <div key={c.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-hover)] transition-colors"
                onClick={() => setSelected(selected === c.name ? null : c.name)}
              >
                <span
                  className="text-[10px] font-semibold rounded-md px-2 py-0.5 flex-shrink-0"
                  style={{
                    backgroundColor: { Root: '#6366f1', Navigation: '#0ea5e9', 'Core UI': '#c85a3a', Display: '#10b981', Input: '#f59e0b', Config: '#8b5cf6', Stats: '#ec4899', API: '#3b82f6', Types: '#6b7280', State: '#84cc16' }[c.role] + '22',
                    color: { Root: '#6366f1', Navigation: '#0ea5e9', 'Core UI': '#c85a3a', Display: '#10b981', Input: '#f59e0b', Config: '#8b5cf6', Stats: '#ec4899', API: '#3b82f6', Types: '#6b7280', State: '#84cc16' }[c.role],
                  }}
                >{c.role}</span>
                <code className="text-xs font-mono text-[var(--text-primary)] flex-1">{c.name}</code>
                <span className="text-[var(--text-tertiary)] text-xs">{selected === c.name ? '▲' : '▼'}</span>
              </button>
              {selected === c.name && (
                <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">{c.desc}</p>
                  {c.deps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] text-[var(--text-tertiary)]">imports:</span>
                      {c.deps.map(d => (
                        <code key={d} className="text-[11px] font-mono bg-[var(--surface-hover)] px-2 py-0.5 rounded">{d}</code>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack used in frontend */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Frontend Tech Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { name: 'Next.js 16.2.6', role: 'Framework', note: 'App Router, streaming API routes, Vercel-native' },
            { name: 'React 19', role: 'UI', note: 'Client components, hooks, streaming UI state' },
            { name: 'Tailwind CSS v4', role: 'Styling', note: 'CSS variables for dark mode, utility-first' },
            { name: 'TypeScript 5', role: 'Language', note: 'Strict types across all components and API' },
            { name: 'react-markdown', role: 'Rendering', note: 'GitHub-Flavored Markdown with remark-gfm' },
            { name: 'react-syntax-highlighter', role: 'Code', note: 'oneDark theme, 100+ language support' },
            { name: 'lucide-react', role: 'Icons', note: 'Send, Paperclip, ChevronDown, Zap icons' },
            { name: '@anthropic-ai/sdk', role: 'AI', note: 'Used server-side in the API route only' },
            { name: 'localStorage', role: 'Storage', note: 'Persists all conversations client-side' },
          ].map(i => (
            <div key={i.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{i.name}</div>
              <div className="text-[10px] font-medium text-[var(--accent)] uppercase tracking-wider mt-0.5">{i.role}</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{i.note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Arrow({ label, reverse }: { label: string; reverse?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      {!reverse && <div className="w-px h-4 bg-[var(--border)]" />}
      <div className="text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-hover)] px-2.5 py-1 rounded-full border border-[var(--border)]">{label}</div>
      {reverse && <div className="w-px h-4 bg-[var(--border)]" />}
    </div>
  )
}

function StorageSection() {
  return (
    <div className="space-y-10">

      {/* Backend storage (CLI) */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">CLI / Backend Storage (Priority Order)</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {STORAGE_LAYERS.map((s, i) => (
            <div key={s.label} className={`flex gap-4 px-5 py-4 ${i !== STORAGE_LAYERS.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: s.color }}>
                  {i + 1}
                </div>
                {i < STORAGE_LAYERS.length - 1 && <div className="w-px flex-1 bg-[var(--border)]" />}
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</span>
                  <span className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">{s.scope}</span>
                </div>
                <code className="text-[11px] font-mono text-[var(--text-secondary)] block mb-1">{s.path}</code>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2 pl-1">Later sources override earlier ones. Policy settings have the highest precedence and cannot be overridden by users.</p>
      </div>

      {/* Memory system */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Memory System (~/.claude/memory/)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: 'user', color: '#6366f1', desc: 'Role, expertise, preferences — shapes how Claude responds to you', file: 'user_*.md' },
            { type: 'feedback', color: '#c85a3a', desc: 'Corrections and confirmations — prevents repeating mistakes', file: 'feedback_*.md' },
            { type: 'project', color: '#0ea5e9', desc: 'Ongoing work, goals, deadlines, architectural decisions', file: 'project_*.md' },
            { type: 'reference', color: '#10b981', desc: 'Pointers to external systems — Linear, Slack channels, dashboards', file: 'reference_*.md' },
          ].map(m => (
            <div key={m.type} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: m.color + '22' }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">{m.type}</div>
              <code className="text-[10px] font-mono text-[var(--text-tertiary)] block mb-2">{m.file}</code>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">MEMORY.md</strong> — An index file at <code className="font-mono bg-[var(--surface-hover)] px-1 rounded">~/.claude/memory/MEMORY.md</code> lists all memory files with one-line summaries. It is loaded into every conversation context automatically.
        </div>
      </div>

      {/* Frontend storage */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Frontend Storage (Web UI)</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/30 px-4 py-3 flex-1">
              <div className="text-xs font-semibold text-[#6366f1] mb-1">localStorage (browser)</div>
              <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">Key: <code className="font-mono bg-[var(--surface-hover)] px-1 rounded">peterclaude_conversations</code> · Stores full conversation array as JSON including all messages, attachments metadata, token usage, and cumulative cost.</div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3 font-mono text-[10px] text-[var(--text-secondary)] overflow-x-auto whitespace-pre">{`Conversation {
  id: string           // crypto.randomUUID()
  title: string        // auto-generated from first message
  model: ModelId       // e.g. "claude-sonnet-4-6"
  messages: Message[]  // full history
  createdAt: number    // epoch ms
  updatedAt: number    // epoch ms
  totalUsage: {
    inputTokens: number
    outputTokens: number
  }
}`}</div>

          <div className="text-xs text-[var(--text-tertiary)]">All data is stored 100% client-side — nothing is sent to any server except the active message thread sent to <code className="font-mono bg-[var(--surface-hover)] px-1 rounded">/api/chat</code> during inference.</div>
        </div>
      </div>

      {/* Session / transcript storage */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Session Transcripts (CLI)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { path: '~/.claude/sessions/', desc: 'JSONL transcript files, one per conversation session. Each line is a JSON event (message, tool call, tool result).' },
            { path: '~/.claude/projects/', desc: 'Project-specific session index files linking sessions to project directories.' },
          ].map(s => (
            <div key={s.path} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <code className="text-xs font-mono text-[var(--accent)] block mb-2">{s.path}</code>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ModelsSection() {
  const [provider, setProvider] = useState('firstParty')

  return (
    <div className="space-y-10">

      {/* Model selection priority */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Model Selection Priority (CLI)</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {[
            { rank: '1', label: '/model command', desc: 'Overrides set during the active session via the /model slash command — highest priority', where: 'bootstrap/state.ts · getMainLoopModelOverride()' },
            { rank: '2', label: '--model flag', desc: 'Model specified at startup via the --model CLI argument', where: 'cli/handlers/auth.ts' },
            { rank: '3', label: 'ANTHROPIC_MODEL', desc: 'Environment variable override', where: 'process.env.ANTHROPIC_MODEL' },
            { rank: '4', label: 'settings.json', desc: 'Saved preference from a previous /model command or manual edit', where: '~/.claude/settings.json · model key' },
            { rank: '5', label: 'Default model', desc: 'Falls back to the current recommended default (claude-sonnet-4-6)', where: 'utils/model/model.ts · getDefaultModel()' },
          ].map((r, i) => (
            <div key={r.rank} className={`flex gap-4 px-5 py-3.5 ${i !== 4 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{r.rank}</div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{r.label}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">{r.desc}</div>
                <code className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1 block">{r.where}</code>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Providers */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">API Providers</h3>
        <div className="flex gap-2 mb-4 flex-wrap">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={provider === p.id ? { backgroundColor: p.color, color: 'white' } : { backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
            >{p.label}</button>
          ))}
        </div>
        {PROVIDERS.filter(p => p.id === provider).map(p => (
          <div key={p.id} className="rounded-2xl border-2 p-5" style={{ borderColor: p.color + '44', backgroundColor: p.color + '08' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-base font-semibold" style={{ color: p.color }}>{p.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Env Variable</div>
                <code className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-1 rounded block">{p.env}</code>
              </div>
              <div>
                <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Endpoint Pattern</div>
                <code className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--surface)] px-2 py-1 rounded block">{p.endpoint}</code>
              </div>
            </div>
            {p.id === 'bedrock' && (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">Bedrock model strings are resolved from AWS Inference Profile ARNs — Claude Code queries your configured Bedrock inference profiles and matches them to built-in model IDs automatically.</p>
            )}
          </div>
        ))}
      </div>

      {/* Model registry */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Model Registry (src/utils/model/configs.ts) — {MODELS.length} models</h3>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-hover)]">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Key</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">First-Party ID</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Generation</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Tier</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map((m, i) => (
                <tr key={m.key} className={`border-t border-[var(--border)] ${i % 2 === 0 ? 'bg-[var(--surface)]' : 'bg-[var(--surface-hover)]'}`}>
                  <td className="px-4 py-2.5"><code className="font-mono text-xs text-[var(--accent)]">{m.key}</code></td>
                  <td className="px-4 py-2.5"><code className="font-mono text-xs text-[var(--text-secondary)]">{m.id}</code></td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{m.gen}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: TIER_COLORS[m.tier] }}>{m.tier}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-2 pl-1">Each key maps to 4 provider-specific ID strings (firstParty, bedrock, vertex, foundry). The correct string is selected at runtime based on the active provider env variable.</p>
      </div>

      {/* Model selection in web UI */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-3">Model Selection in the Web UI</h3>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          {[
            { step: '1', title: 'Initial default', desc: 'ChatView mounts with claude-sonnet-4-6 as default. Syncs to conversation.model if a saved conversation is loaded.' },
            { step: '2', title: 'ModelSelector dropdown', desc: 'User opens the dropdown above the input box. Three models shown: Opus 4.6, Sonnet 4.6, Haiku 4.5 — each with live pricing ($/M tokens).' },
            { step: '3', title: 'Per-message model', desc: 'The selected model is stored in React state and sent with every /api/chat request. Each Message object records which model generated it.' },
            { step: '4', title: 'Cost tracking', desc: 'TokenBadge reads the model\'s pricing from MODELS[] and calculates cost as (inputTokens/1M × inputPrice) + (outputTokens/1M × outputPrice).' },
            { step: '5', title: 'Persistence', desc: 'Conversation.model is written to localStorage so the same model is pre-selected when a conversation is resumed.' },
          ].map((s, i) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</div>
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ArchitecturePage() {
  const [tab, setTab] = useState('stack')

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">← Chat</Link>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">PeterClaude Architecture</h1>
              <p className="text-xs text-[var(--text-tertiary)]">An in-depth look at the full system</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-[var(--text-tertiary)]">Live · sourced from codebase</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'stack' && <StackSection />}
        {tab === 'frontend' && <FrontendSection />}
        {tab === 'storage' && <StorageSection />}
        {tab === 'models' && <ModelsSection />}
      </div>
    </div>
  )
}
