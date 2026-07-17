function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          Rishi AI
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Content Production Operating System — Local Scaffolding Shell.
        </p>
        <div className="mt-6 flex gap-3">
          <div className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
            Editor
          </div>
          <div className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            Research
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
