export function ChatPanel({ messages, question, setQuestion, onSend, loading, disabled }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur-xl animate-floatUp [animation-delay:320ms]">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.3em] text-sea-300/80">Step 4</p>
        <h2 className="font-display text-2xl text-white">Chat with your dataset</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Ask questions grounded in the uploaded CSV. The backend builds a FAISS index and uses OpenAI for retrieval-augmented answers.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
        <div className="mb-4 h-80 space-y-4 overflow-y-auto rounded-2xl bg-ink-950/50 p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-400">No conversation yet. Try asking for a trend, segment summary, or class distribution.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-sun-400 text-ink-950'
                    : 'bg-white/5 text-slate-100'
                }`}
              >
                <p>{message.content}</p>
                {message.sources?.length ? (
                  <p className="mt-2 text-xs text-sea-300">Sources: {message.sources.join(', ')}</p>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What stands out about churned customers?"
            className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-sea-300"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={disabled || loading || !question.trim()}
            className="rounded-xl bg-sea-400 px-5 py-3 font-medium text-ink-950 transition hover:bg-sea-300 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}
