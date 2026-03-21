import React, { useState, useEffect, useRef } from 'react';
import { Category, NewsArticle, Language } from './types';
import { fetchNews, generateSpeech, decodeAudio, createWavBlob } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  Download, 
  Play, 
  Pause, 
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';

const CATEGORY_IMAGES: Record<string, string> = {
  [Category.UNES]: "https://images.unsplash.com/photo-1504711432869-5d39a142df4a?auto=format&fit=crop&w=1200&q=80",
  [Category.GEOPOLITIQUE]: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80",
  [Category.FINANCE]: "https://images.unsplash.com/photo-1611974714024-462cd9a7070a?auto=format&fit=crop&w=1200&q=80",
  [Category.METEO]: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1200&q=80",
  [Category.SOCIETE]: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80",
  [Category.TECH]: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
};

const ArticleIllustration: React.FC<{ category: Category; className?: string }> = ({ category, className }) => {
  const imageUrl = CATEGORY_IMAGES[category] || CATEGORY_IMAGES[Category.UNES];
  return (
    <div className={`relative w-full h-full overflow-hidden border border-zinc-100 ${className}`}>
      <img 
        src={imageUrl} 
        alt={category} 
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [lang] = useState<Language>(Language.FR);
  const [category, setCategory] = useState<Category>(Category.UNES);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<NewsArticle | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const [radioIndex, setRadioIndex] = useState(-1);
  const [copied, setCopied] = useState(false);

  const audioCtx = useRef<AudioContext | null>(null);
  const audioSource = useRef<AudioBufferSourceNode | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(category, lang);
      setArticles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [category]);

  const handleSpeak = async (text: string, id: string, onEnded?: () => void) => {
    if (speakingId === id) {
      if (audioSource.current) { try { audioSource.current.stop(); } catch(e) {} }
      setSpeakingId(null);
      return;
    }
    if (audioSource.current) { try { audioSource.current.stop(); } catch(e) {} }
    setSpeakingId(id);
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    try {
      const bytes = await generateSpeech(text, lang);
      if (bytes && audioCtx.current) {
        const buffer = await decodeAudio(bytes, audioCtx.current);
        const source = audioCtx.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.current.destination);
        source.onended = () => { setSpeakingId(null); if (onEnded) onEnded(); };
        audioSource.current = source;
        source.start(0);
      }
    } catch (e) { setSpeakingId(null); }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-zinc-900 font-serif">
      <header className="py-12 text-center border-b-4 border-double border-black mx-6">
        <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase">LE CONTRE DU MATIN</h1>
        <p className="text-[10px] font-bold tracking-[0.5em] opacity-50 mt-4 uppercase">Propriété de Atmani Bachir • {new Date().toLocaleDateString('fr-FR')}</p>
      </header>

      <nav className="sticky top-0 bg-[#FDFCF8]/90 backdrop-blur z-50 border-b border-black flex justify-center gap-6 py-4 overflow-x-auto px-6">
        {Object.values(Category).map(cat => (
          <button 
            key={cat} 
            onClick={() => setCategory(cat)} 
            className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${category === cat ? 'underline decoration-2' : 'opacity-40'}`}
          >
            {cat}
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20 italic opacity-40 text-2xl">Rédaction en cours...</div>
        ) : error ? (
          <div className="max-w-md mx-auto text-center p-10 border-2 border-red-600 rounded-3xl">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Erreur de Quota</h2>
            <p className="text-sm opacity-60 mb-6">{error}</p>
            <button onClick={loadData} className="bg-black text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest">Réessayer</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {articles.map((art, i) => (
              <article key={art.id} className={`${i === 0 ? 'md:col-span-3 border-b-2 border-black pb-12' : ''} space-y-4`}>
                <div className={`aspect-video rounded-sm overflow-hidden ${i === 0 ? 'md:aspect-[21/9]' : ''}`}>
                  <ArticleIllustration category={art.category} />
                </div>
                <h2 className={`${i === 0 ? 'text-4xl md:text-7xl' : 'text-2xl'} font-black italic leading-none`}>{art.title}</h2>
                <p className="text-lg font-bold opacity-70 leading-tight">{art.summary}</p>
                <div className="prose prose-zinc max-w-none text-zinc-800 leading-relaxed">
                  <ReactMarkdown>{art.content}</ReactMarkdown>
                </div>
                <footer className="pt-4 flex items-center justify-between border-t border-zinc-100 italic opacity-40 text-[10px] font-bold uppercase tracking-widest">
                  <span>Par {art.author}</span>
                  <button onClick={() => handleSpeak(art.content, art.id)} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                    {speakingId === art.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {speakingId === art.id ? 'ARRÊTER' : 'ÉCOUTER'}
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-20 border-t border-black mx-6 opacity-30 text-[9px] font-bold uppercase tracking-[0.5em]">
        © {new Date().getFullYear()} LE CONTRE DU MATIN — ATMANI BACHIR
      </footer>
    </div>
  );
};

export default App;
