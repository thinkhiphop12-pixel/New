import { useState } from 'react';
import { ARTICLES_DB } from '@/data/footballData';

interface Props {
  addXP: (amount: number, achievementId?: string) => void;
}

export default function AnalysisBlog({ addXP }: Props) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [readingArticle, setReadingArticle] = useState<typeof ARTICLES_DB[0] | null>(null);
  const [xpAwarded, setXpAwarded] = useState(false);

  const allTags = [...new Set(ARTICLES_DB.flatMap(a => a.tags))];

  const filtered = ARTICLES_DB.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.summary.toLowerCase().includes(search.toLowerCase());
    const matchTag = !selectedTag || a.tags.includes(selectedTag);
    return matchSearch && matchTag;
  });

  const openArticle = (article: typeof ARTICLES_DB[0]) => {
    setReadingArticle(article);
    if (!xpAwarded) {
      addXP(30);
      setXpAwarded(true);
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" /><path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" /></svg>
          Analysis Blog
        </h2>

        {/* Search & Filter */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px]"
          />
          <select value={selectedTag || ''} onChange={e => setSelectedTag(e.target.value || null)} className="w-40">
            <option value="">All Tags</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                selectedTag === tag ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(article => (
          <button key={article.id} onClick={() => openArticle(article)} className="glass-card p-4 text-left hover:scale-[1.02] transition-transform">
            <div className="flex gap-1 mb-2 flex-wrap">
              {article.tags.map(tag => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFD700]/10 text-[#FFD700]/70">{tag}</span>
              ))}
            </div>
            <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{article.title}</h3>
            <p className="text-xs text-white/50 mb-3 line-clamp-2">{article.summary}</p>
            <div className="flex justify-between items-center text-[10px] text-white/30">
              <span>{article.author}</span>
              <span>{article.readTime} read</span>
            </div>
          </button>
        ))}
      </div>

      {/* Article Modal */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setReadingArticle(null)}>
          <div className="glass-card max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0D1B2A]/90 backdrop-blur-md p-4 border-b border-white/10 flex justify-between items-start">
              <div>
                <div className="flex gap-1 mb-1">
                  {readingArticle.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFD700]/10 text-[#FFD700]/70">{tag}</span>
                  ))}
                </div>
                <h3 className="text-lg font-bold text-white">{readingArticle.title}</h3>
              </div>
              <button onClick={() => setReadingArticle(null)} className="text-white/40 hover:text-white ml-4">✕</button>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center text-xs text-white/40 mb-4">
                <span>By {readingArticle.author}</span>
                <span>{readingArticle.date} · {readingArticle.readTime} read</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{readingArticle.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
