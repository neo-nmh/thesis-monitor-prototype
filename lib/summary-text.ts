// Also keep summaries saved before the one-sentence format concise on screen.
export function summarySentence(text:string){
 const normalized=text.replace(/\s+/g,' ').trim();
 for(const {segment} of new Intl.Segmenter('en',{granularity:'sentence'}).segment(normalized))return segment.trim();
 return normalized;
}
