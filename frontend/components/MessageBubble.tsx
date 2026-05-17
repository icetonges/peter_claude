'use client'

import { Message, MODELS } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import TokenBadge from './TokenBadge'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
  message: Message
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      title="Copy code"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const modelName = message.model ? (MODELS.find(m => m.id === message.model)?.name ?? message.model) : null
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
        isUser
          ? 'bg-[var(--accent)] text-white'
          : 'bg-gradient-to-br from-[#da7756] to-[#c85a3a] text-white'
      }`}>
        {isUser ? 'You' : 'C'}
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 text-xs text-[var(--text-tertiary)] ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="font-medium">{isUser ? 'You' : (modelName ?? 'Claude')}</span>
          <span>{time}</span>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-1">
            {message.attachments.map(att => (
              att.type.startsWith('image/') ? (
                <img
                  key={att.id}
                  src={`data:${att.type};base64,${att.data}`}
                  alt={att.name}
                  className="max-w-xs max-h-48 rounded-lg border border-[var(--border)] object-contain"
                />
              ) : (
                <div key={att.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <span>📄</span>
                  <span>{att.name}</span>
                  <span className="text-[var(--text-tertiary)]">({(att.size / 1024).toFixed(1)} KB)</span>
                </div>
              )
            ))}
          </div>
        )}

        {/* Message bubble */}
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-[var(--user-bubble)] px-4 py-2.5 text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-[var(--text-primary)] leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeStr = String(children).replace(/\n$/, '')
                  const isBlock = codeStr.includes('\n') || match
                  if (isBlock) {
                    return (
                      <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[var(--border)]">
                        <div className="flex items-center justify-between bg-[var(--code-header)] px-4 py-2">
                          <span className="text-xs text-[var(--text-tertiary)]">{match ? match[1] : 'code'}</span>
                          <CopyButton text={codeStr} />
                        </div>
                        <SyntaxHighlighter
                          style={oneDark as any}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0, background: 'var(--code-bg)', fontSize: '0.8rem' }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code className="rounded bg-[var(--code-inline)] px-1 py-0.5 text-[0.85em] font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                p({ children }) { return <p className="mb-3 last:mb-0">{children}</p> },
                ul({ children }) { return <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul> },
                ol({ children }) { return <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol> },
                li({ children }) { return <li className="leading-relaxed">{children}</li> },
                h1({ children }) { return <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1> },
                h2({ children }) { return <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2> },
                h3({ children }) { return <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3> },
                blockquote({ children }) {
                  return <blockquote className="border-l-4 border-[var(--accent)] pl-4 my-3 text-[var(--text-secondary)] italic">{children}</blockquote>
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  )
                },
                th({ children }) { return <th className="border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-left font-semibold">{children}</th> },
                td({ children }) { return <td className="border border-[var(--border)] px-3 py-2">{children}</td> },
                a({ href, children }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">{children}</a>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Token usage badge for assistant messages */}
        {!isUser && message.usage && message.model && (
          <div className="mt-1">
            <TokenBadge usage={message.usage} model={message.model} />
          </div>
        )}
      </div>
    </div>
  )
}
