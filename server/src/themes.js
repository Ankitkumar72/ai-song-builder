// server/src/themes.js
// Simple theme extractor for MVP: n-gram frequency + phrase normalization
const STOP = new Set([
  "the","and","a","in","of","to","is","it","on","for","with","that","this","i","you","we","be","are","my","your","me","so","at","was","but","by","from","as","an"
]);

function normalize(text){
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text){
  return normalize(text).split(' ').filter(Boolean).filter(t=>!STOP.has(t));
}

function ngrams(words, n){
  const out = [];
  for(let i=0;i+ n <= words.length;i++){
    out.push(words.slice(i,i+n).join(' '));
  }
  return out;
}

/**
 * extractThemes(lyricsArray, topK = 5)
 * lyricsArray: [{text: "...", userId, ts}, ...]
 * returns array of { id, text, count }
 */
function extractThemes(lyricsArray = [], topK = 5){
  const map = new Map();

  for(const item of lyricsArray){
    const txt = item.text || '';
    const w = tokens(txt);
    if(w.length === 0) continue;

    // unigrams
    for(const u of w) {
      map.set(u, (map.get(u)||0)+1);
    }
    // bigrams and trigrams to capture short phrases
    const bi = ngrams(w, 2);
    for(const b of bi) map.set(b, (map.get(b)||0)+1);
    const tri = ngrams(w, 3);
    for(const t of tri) map.set(t, (map.get(t)||0)+1);

    // also include full-sentence as candidate (weighted less)
    const norm = normalize(txt);
    if(norm.length>4) map.set(norm, (map.get(norm)||0)+0.5);
  }

  // convert to array and sort by count desc
  const arr = Array.from(map.entries()).map(([text,count]) => ({ text, count }));
  arr.sort((a,b)=> b.count - a.count);

  // dedupe by text similarity small heuristics: if first word equal prefer longer phrase?
  const selected = [];
  const seen = new Set();
  for(const it of arr){
    const key = it.text;
    if(seen.has(key)) continue;
    // avoid including too-similar short tokens if longer phrase exists
    let skip = false;
    for(const s of selected){
      if(s.text.includes(key) || key.includes(s.text)) {
        skip = true;
        break;
      }
    }
    if(skip) continue;
    selected.push({ id: Math.random().toString(36).slice(2,9), text: it.text, count: it.count });
    seen.add(key);
    if(selected.length >= topK) break;
  }

  return selected;
}

module.exports = { extractThemes };
