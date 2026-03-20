import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Radio, Newspaper, TrendingUp, 
  Globe, Cpu, Palette, Trophy, ChevronRight, 
  Play, Pause, Volume2, Share2, Clock, User,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { Category, NewsArticle, Language } from './types';
import { fetchNews, generateSpeech } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utilitaire pour Tailwind
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES: { id: Category; icon: any; label: string }[] = [
  { id: 'A LA UNE', icon: Newspaper, label: 'À la Une' },
  { id: 'POLITIQUE', icon: Globe, label: 'Politique' },
  { id: 'ECONOMIE', icon: TrendingUp, label: 'Économie' },
  { id: 'TECH', icon: Cpu, label: 'Tech' },
  { id: 'CULTURE', icon: Palette, label: 'Culture' },
  { id: 'SPORT', icon: Trophy, label: 'Sport' },
];

export default function App() {
  const [category, setCategory] = useState<Category>('A LA UNE');
  const [lang, setLang] = useState<Language>('FR');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chargement des articles
  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNews(category, lang);
      setArticles(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des actualités.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [category, lang]);

  // Gestion de la lecture audio (Radio)
  const handlePlayAudio = async (text: string) => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrl) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    try {
      const url = await generateSpeech(text);
      if (url) {
        setAudioUrl(url);
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("Erreur audio:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8] text-[#1a1a1a] selection:bg-orange-100">
      {/* HEADER ÉDITORIAL */}
      <header className="border-b border-black/10 sticky top-0 bg-[#fdfcf8]/90 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
            <Menu className="w-6 h-6" />
          </button>

          <div className="text-center flex flex-col items-center">
            <h1 className="newspaper-title text-3xl md:text-5xl font-black tracking-tighter">
              LE CONTRE DU MATIN
            </h1>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold opacity-60 mt-1">
              <span>Édition du {new Date().toLocaleDateString('fr-FR')}</span>
              <span className="w-1 h-1 bg-black rounded-full" />
              <span>Propriété de Atmani Bachir</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-transparent border-none text-xs font-bold focus:ring-0 cursor-pointer"
            >
              <option value="FR">FR</option>
              <option value="EN">EN</option>
              <option value="AR">AR</option>
            </select>
          </div>
        </div>
      </header>

      {/* NAVIGATION CATÉGORIES */}
      <nav className="border-b border-black/5 overflow-x-auto no-scrollbar bg-white/50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 h-12">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all relative py-3",
                category === cat.id ? "text-orange-700" : "text-black/40 hover:text-black"
              )}
            >
              {cat.label}
              {category === cat.id && (
                <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-700" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse-soft space-y-4">
                <div className="aspect-video bg-black/5 rounded-sm" />
                <div className="h-8 bg-black/5 w-3/4" />
                <div className="h-20 bg-black/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Oups ! Quelque chose a coincé.</h2>
            <p className="text-black/60 mb-6">{error}</p>
            <button onClick={loadNews} className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full font-bold text-sm">
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            {/* ARTICLE PRINCIPAL (A LA UNE) */}
            <div className="md:col-span-8 space-y-8">
              {articles[0] && (
                <article className="group cursor-pointer" onClick={() => setSelectedArticle(articles[0])}>
                  <div className="relative aspect-[16/9] overflow-hidden mb-6">
                    <img 
                      src={articles[0].imageUrl} 
                      alt={articles[0].title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {articles[0].isBreaking && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 uppercase tracking-tighter">
                        Flash Info
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <h2 className="article-title text-4xl md:text-6xl font-black group-hover:text-orange-800 transition-colors">
                      {articles[0].title}
                    </h2>
                    <p className="text-lg text-black/70 leading-relaxed font-medium line-clamp-3">
                      {articles[0].summary}
                    </p>
                    <div className="flex items-center gap-6 text-[11px] font-bold uppercase tracking-widest opacity-50">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {articles[0].author}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {articles[0].readTime}</span>
                    </div>
                  </div>
                </article>
              )}
            </div>

            {/* ARTICLES SECONDAIRES */}
            <div className="md:col-span-4 space-y-12">
              <div className="border-t-4 border-black pt-4">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6">Dernières Nouvelles</h3>
                <div className="space-y-8">
                  {articles.slice(1).map((article) => (
                    <article 
                      key={article.id} 
                      className="group cursor-pointer border-b border-black/5 pb-6 last:border-0"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <h4 className="article-title text-xl font-bold mb-3 group-hover:text-orange-800 transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-sm text-black/60 line-clamp-2 mb-3">
                        {article.summary}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-40">
                        <span>{article.category}</span>
                        <span>{article.readTime}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {/* WIDGET RADIO IA */}
              <div className="bg-orange-50 p-6 rounded-sm border border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Radio IA</h4>
                    <p className="text-[10px] opacity-60">Écoutez le briefing du matin</p>
                  </div>
                </div>
                <button 
                  onClick={() => handlePlayAudio(articles[0]?.content || "")}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? "Pause" : "Écouter l'IA"}
                </button>
                {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ARTICLE COMPLET */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#fdfcf8] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl"
            >
              <div className="sticky top-0 bg-[#fdfcf8]/90 backdrop-blur-md p-4 flex justify-between items-center border-b border-black/5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{selectedArticle.category}</span>
                <button onClick={() => setSelectedArticle(null)} className="p-2 hover:bg-black/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 md:p-12">
                <header className="mb-12 text-center max-w-2xl mx-auto">
                  <h2 className="article-title text-4xl md:text-6xl font-black mb-6 leading-tight">
                    {selectedArticle.title}
                  </h2>
                  <div className="flex items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-widest opacity-50">
                    <span>Par {selectedArticle.author}</span>
                    <span className="w-1 h-1 bg-black rounded-full" />
                    <span>{selectedArticle.date}</span>
                  </div>
                </header>
                <img 
                  src={selectedArticle.imageUrl} 
                  alt={selectedArticle.title}
                  className="w-full aspect-video object-cover mb-12 grayscale-[20%]"
                />
                <div className="max-w-2xl mx-auto prose prose-orange prose-lg">
                  <p className="text-xl font-bold text-black/80 mb-8 leading-relaxed italic border-l-4 border-orange-600 pl-6">
                    {selectedArticle.summary}
                  </p>
                  <div className="text-black/70 leading-loose space-y-6 first-letter:text-7xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-orange-800">
                    {selectedArticle.content.split('\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MENU LATÉRAL */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-12">
                <h3 className="newspaper-title text-xl font-black">Archives</h3>
                <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                {CATEGORIES.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setIsMenuOpen(false); }}
                    className="flex items-center gap-4 w-full p-3 hover:bg-orange-50 rounded-sm transition-colors group"
                  >
                    <cat.icon className="w-5 h-5 opacity-40 group-hover:text-orange-600 group-hover:opacity-100" />
                    <span className="text-sm font-bold uppercase tracking-widest">{cat.label}</span>
                  </button>
                ))}
              </div>
              <div className="absolute bottom-8 left-8 right-8 pt-8 border-t border-black/5">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-2">Propriété de</p>
                <p className="text-sm font-black">Atmani Bachir</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="border-t border-black/10 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="newspaper-title text-2xl font-black mb-4">LE CONTRE DU MATIN</h2>
          <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-8">
            Briefing matinal rédigé par l'IA à 6:00 AM
          </p>
          <div className="flex justify-center gap-8 mb-8">
            <button className="p-2 hover:bg-black/5 rounded-full"><Share2 className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-black/5 rounded-full"><Volume2 className="w-5 h-5" /></button>
          </div>
          <p className="text-[10px] font-bold opacity-30">
            © {new Date().getFullYear()} ATMANI BACHIR. TOUS DROITS RÉSERVÉS.
          </p>
        </div>
      </footer>
    </div>
  );
}
