import './index.css'

function App() {
  return (
    <div className="min-h-screen pb-20 bg-gray-50/50">
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-dark text-center">Game of Life: React Edition</h1>
      </header>
      
      <main className="max-w-7xl mx-auto px-6">
        <div className="glass-card p-8 rounded-3xl text-center">
          <h2 className="text-xl font-bold text-primary mb-2">Systems Online</h2>
          <p className="text-muted">Tailwind v4 is compiling perfectly.</p>
        </div>
      </main>
    </div>
  )
}

export default App