import { useEffect, useRef, useState } from 'react';
import { useCircle } from '../lib/CircleContext';
import { AppHeader } from '../components/AppHeader';
import { BottomTabBar } from '../components/BottomTabBar';
import { RADAR_SUGGESTIONS } from '../lib/radar';

interface Msg {
  id: number;
  who: 'user' | 'radar';
  text: string;
}

export function Radar() {
  const circle = useCircle();
  const firstName = circle.circle.seniorDisplayName.split(' ')[0];
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 0,
      who: 'radar',
      text: `Hi — ask me anything about how ${firstName} is doing. I can look over today and the past week.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId.current++, who: 'user', text }]);
    setThinking(true);
    try {
      const answer = await circle.askRadar(text);
      setMessages((m) => [...m, { id: nextId.current++, who: 'radar', text: answer }]);
    } finally {
      setThinking(false);
    }
  }

  const showSuggestions = messages.filter((m) => m.who === 'user').length === 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader title="Radar" subtitle={`Ask about ${firstName}`} backTo="/dashboard" />

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m) =>
          m.who === 'radar' ? (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--primary-tint)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                ✦
              </div>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px 16px 16px 16px',
                  padding: '12px 14px',
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: 'var(--text)',
                  maxWidth: '85%',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  borderRadius: '16px 16px 4px 16px',
                  padding: '12px 14px',
                  fontSize: 15,
                  lineHeight: 1.5,
                  maxWidth: '85%',
                }}
              >
                {m.text}
              </div>
            </div>
          ),
        )}

        {thinking && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <div
              aria-hidden="true"
              style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}
            >
              ✦
            </div>
            <span aria-live="polite">Looking…</span>
          </div>
        )}

        {showSuggestions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {RADAR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontSize: 14,
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 10 }}>
        <label htmlFor="radar-input" className="sr-only">
          Ask a question about {firstName}
        </label>
        <input
          id="radar-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder={`Ask about ${firstName}…`}
          style={{
            flex: 1,
            height: 46,
            borderRadius: 999,
            border: '1px solid var(--border-strong)',
            padding: '0 16px',
            fontSize: 15,
          }}
        />
        <button
          onClick={() => ask(input)}
          disabled={!input.trim() || thinking}
          aria-label="Send"
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: input.trim() && !thinking ? 'var(--primary)' : 'var(--surface-sunken)',
            color: input.trim() && !thinking ? '#fff' : 'var(--text-muted)',
            border: 'none',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '6px 0', background: 'var(--surface)' }}>
        Radar is read-only — it can look, but never changes anything.
      </div>

      <BottomTabBar />
    </div>
  );
}
