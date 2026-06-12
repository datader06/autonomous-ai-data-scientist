export function UploadSection({
  uploadFile,
  onFileSelect,
  onUpload,
  uploading,
  dataset,
  availableColumns,
  targetColumn,
  setTargetColumn,
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur-xl animate-floatUp">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sea-300/80">Step 1</p>
          <h2 className="font-display text-2xl text-white">Upload dataset</h2>
        </div>
        <div className="rounded-full border border-sea-300/30 bg-sea-300/10 px-3 py-1 text-xs text-sea-300">
          CSV only
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <label className="flex min-h-36 cursor-pointer flex-col justify-center rounded-2xl border border-dashed border-white/15 bg-ink-900/60 p-5 transition hover:border-sea-300/50 hover:bg-ink-900">
          <span className="mb-2 font-medium text-white">Choose a dataset</span>
          <span className="text-sm text-slate-300">Drop in a CSV or click to browse. We’ll profile the schema immediately.</span>
          <input
            type="file"
            accept=".csv"
            className="mt-4 block text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-sun-400 file:px-4 file:py-2 file:font-medium file:text-ink-950 hover:file:bg-sun-300"
            onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
          />
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
          <p className="text-sm text-slate-300">Selected file</p>
          <p className="mt-2 truncate font-medium text-white">{uploadFile?.name || 'No file selected yet'}</p>

          <label className="mt-5 block text-sm text-slate-300">
            Optional target column
            <select
              value={targetColumn}
              onChange={(event) => setTargetColumn(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2 text-white outline-none focus:border-sea-300"
              disabled={!availableColumns?.length}
            >
              <option value="">Auto-detect target</option>
              {availableColumns?.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onUpload}
            disabled={!uploadFile || uploading}
            className="mt-5 w-full rounded-xl bg-sun-400 px-4 py-3 font-medium text-ink-950 transition hover:bg-sun-300 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {uploading ? 'Uploading...' : 'Upload Dataset'}
          </button>
        </div>
      </div>

      {dataset && (
        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-sm text-slate-300">Dataset snapshot</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-200">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-slate-400">Rows</p>
                <p className="mt-1 font-display text-xl text-white">{dataset.rows}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-slate-400">Columns</p>
                <p className="mt-1 font-display text-xl text-white">{dataset.columns.length}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-300">Dataset ID</p>
            <p className="mt-1 break-all text-xs text-sea-300">{dataset.dataset_id}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
            <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-300">Preview</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    {dataset.columns.map((column) => (
                      <th key={column} className="px-4 py-3 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.preview.map((row, index) => (
                    <tr key={index} className="border-t border-white/5 text-slate-200">
                      {dataset.columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-4 py-3">
                          {String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
