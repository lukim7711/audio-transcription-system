import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import JobForm from './components/JobForm';
import StatusPage from './pages/StatusPage';
import PlayerPage from './pages/PlayerPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl">🎤</span>
                <h1 className="text-xl font-bold text-gray-900">
                  Audio Transcription System
                </h1>
              </Link>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<JobForm />} />
              <Route path="/status/:id" element={<StatusPage />} />
              <Route path="/player/:id" element={<PlayerPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-16">
            <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
              <p>
                Powered by Cloudflare, Kaggle, and faster-whisper
              </p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;