/**
 * PostPreview — pixel-perfect, large platform mockups.
 * Each platform/format has a completely distinct visual identity.
 */
import React from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Share2, Play, Send } from "lucide-react";

export interface PostPreviewProps {
  platform: string;
  postType: string;
  caption: string;
  imageUrl?: string | null;
  authorName: string;
  scheduledDate?: string;
}

const handle = (p: string, name: string) => {
  const n = (name || "User").toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    instagram: `@${n}`, linkedin: name || "User",
    x: `@${n}`, facebook: name || "User",
    youtube: name || "Channel", tiktok: `@${n}`,
  };
  return map[p] || `@${n}`;
};

// ─── Phone frame wrapper (for vertical formats) ───────────────────
const PhoneFrame = ({ children, bg = "#000" }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative mx-auto" style={{ width: 260, height: 520 }}>
    {/* outer shell */}
    <div className="absolute inset-0 rounded-[36px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden" style={{ background: bg }}>
      {/* notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-b-2xl z-20"/>
      {/* content */}
      <div className="absolute inset-0 overflow-hidden">{children}</div>
    </div>
    {/* side buttons */}
    <div className="absolute right-[-10px] top-20 w-1.5 h-10 bg-zinc-700 rounded-r-sm"/>
    <div className="absolute left-[-10px] top-16 w-1.5 h-8 bg-zinc-700 rounded-l-sm"/>
    <div className="absolute left-[-10px] top-28 w-1.5 h-8 bg-zinc-700 rounded-l-sm"/>
  </div>
);

// ─── Browser frame wrapper (landscape / desktop formats) ──────────
const BrowserFrame = ({ children, brandColor = "#0077B5" }: { children: React.ReactNode; brandColor?: string }) => (
  <div className="mx-auto rounded-xl overflow-hidden shadow-2xl border border-border/30" style={{ width: 360 }}>
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: brandColor }}>
      <div className="flex gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400"/>
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400"/>
        <div className="h-2.5 w-2.5 rounded-full bg-green-400"/>
      </div>
      <div className="flex-1 bg-white/20 rounded-md h-4 mx-2"/>
    </div>
    {children}
  </div>
);

// ─── Instagram Reel (9:16 phone) ──────────────────────────────────
const IGReelPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <PhoneFrame bg="#000">
    <div className="absolute inset-0">
      {imageUrl
        ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Play className="h-8 w-8 text-white fill-white ml-1"/>
              </div>
            </div>
          </div>
      }
      {/* dark gradient bottom */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)" }}/>
      {/* top bar */}
      <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-10">
        <span className="text-white font-bold text-sm tracking-widest">Reels</span>
        <div className="flex gap-1">
          {[0,1,2].map(i => <div key={i} className={`h-0.5 w-6 rounded-full ${i===1?"bg-white":"bg-white/40"}`}/>)}
        </div>
      </div>
      {/* right sidebar actions */}
      <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-5">
        {/* avatar with + */}
        <div className="relative">
          <div className="h-9 w-9 rounded-full border-2 border-white overflow-hidden" style={{ background: "linear-gradient(135deg,#833ab4,#fcb045)" }}>
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{(authorName||"U")[0]}</div>
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#E1306C] flex items-center justify-center text-white text-[10px] font-bold">+</div>
        </div>
        {[{icon:Heart,n:"14.2k"},{icon:MessageCircle,n:"94"},{icon:Send,n:"Share"},{icon:Bookmark,n:""}].map(({icon:Icon,n},i)=>(
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Icon className="h-6 w-6 text-white drop-shadow-lg"/>
            {n && <span className="text-white text-[9px] font-medium drop-shadow">{n}</span>}
          </div>
        ))}
        {/* music disc */}
        <div className="h-8 w-8 rounded-full border-2 border-white" style={{ background: "linear-gradient(135deg,#1ed760,#191414)" }}>
          <div className="w-full h-full rounded-full flex items-center justify-center text-white text-[8px] font-bold">♪</div>
        </div>
      </div>
      {/* bottom content */}
      <div className="absolute bottom-6 left-3 right-14 z-10">
        <p className="text-white font-semibold text-xs mb-1">{handle("instagram", authorName)}</p>
        <p className="text-white/90 text-[10px] leading-relaxed line-clamp-3">{caption || "Your reel caption here ✨ #reels #redtechafrica"}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-4 w-4 rounded-sm" style={{ background: "linear-gradient(135deg,#833ab4,#fcb045)" }}/>
          <div className="flex-1 h-px bg-white/40"/>
          <span className="text-white/70 text-[9px]">Original audio · REDtech Africa</span>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// ─── Instagram Story (9:16 phone) ─────────────────────────────────
const IGStoryPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <PhoneFrame bg="#000">
    <div className="absolute inset-0">
      {imageUrl
        ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}/>
      }
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)" }}/>
      {/* progress bars */}
      <div className="absolute top-8 left-3 right-3 flex gap-1 z-10">
        {[1,2,3].map(i=><div key={i} className={`h-[2px] flex-1 rounded-full ${i===2?"bg-white":"bg-white/40"}`}/>)}
      </div>
      {/* author row */}
      <div className="absolute top-14 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full p-0.5" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }}>
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-white text-[9px] font-bold">{(authorName||"U")[0]}</div>
          </div>
          <div>
            <p className="text-white text-[10px] font-semibold">{handle("instagram", authorName)}</p>
            <p className="text-white/60 text-[8px]">Now</p>
          </div>
        </div>
        <div className="flex gap-2">
          <MoreHorizontal className="h-4 w-4 text-white"/>
        </div>
      </div>
      {/* bottom reply */}
      <div className="absolute bottom-8 left-3 right-3 z-10">
        {caption && <p className="text-white text-[10px] text-center mb-3 px-4 leading-relaxed bg-black/30 rounded-xl py-2 backdrop-blur-sm">{caption}</p>}
        <div className="flex items-center gap-2">
          <div className="flex-1 border border-white/50 rounded-full px-3 py-1.5 flex items-center gap-2 backdrop-blur-sm">
            <span className="text-white/70 text-[9px] flex-1">Send message...</span>
          </div>
          <Send className="h-5 w-5 text-white"/>
          <Heart className="h-5 w-5 text-white"/>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// ─── Instagram Post (feed card) ───────────────────────────────────
const IGPostPreview = ({ caption, imageUrl, authorName, postType }: PostPreviewProps) => {
  const isPortrait = postType === "portrait";
  return (
    <div className="mx-auto bg-white dark:bg-zinc-900 shadow-2xl" style={{ width: 320, borderRadius: 0 }}>
      {/* Instagram top chrome */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full p-[1.5px]" style={{ background: "linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)" }}>
            <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 p-[1px]">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white text-[8px] font-bold">
                {(authorName||"U")[0]}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold leading-none">{handle("instagram", authorName)}</p>
            <p className="text-[9px] text-zinc-400 mt-0.5">REDtech Africa</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400"/>
      </div>
      {/* image */}
      <div style={{ height: isPortrait ? 380 : 320, background: imageUrl ? undefined : "linear-gradient(135deg,#fce3ec,#ffd6e7)" }}>
        {imageUrl
          ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">📷</div>
        }
      </div>
      {/* actions */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex gap-4">
            <Heart className="h-6 w-6 cursor-pointer hover:text-[#E1306C] transition-colors"/>
            <MessageCircle className="h-6 w-6 cursor-pointer"/>
            <Share2 className="h-6 w-6 cursor-pointer"/>
          </div>
          <Bookmark className="h-6 w-6 cursor-pointer"/>
        </div>
        <p className="text-xs font-bold mb-1">14,200 likes</p>
        <p className="text-xs pb-2 leading-relaxed">
          <span className="font-semibold">{handle("instagram", authorName)}</span>{" "}
          <span className="text-zinc-600 dark:text-zinc-400">{(caption||"Your caption here...").slice(0,120)}{(caption||"").length>120?"... more":""}</span>
        </p>
        <p className="text-[10px] text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">View all 94 comments</p>
        <p className="text-[9px] text-zinc-300 py-1.5 uppercase tracking-widest">Just now</p>
      </div>
    </div>
  );
};

// ─── LinkedIn Post ────────────────────────────────────────────────
const LinkedInPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <BrowserFrame brandColor="#0077B5">
    <div className="bg-[#f3f2ef] dark:bg-zinc-900 p-3">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
        <div className="p-3 flex gap-2.5">
          <div className="h-11 w-11 rounded-full bg-[#0077B5] flex items-center justify-center text-white text-base font-bold flex-shrink-0">
            {(authorName||"U")[0]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">{authorName || "Team Member"}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Social Media Manager · REDtech Africa</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-zinc-400">Just now ·</span>
              <svg className="h-3 w-3 text-zinc-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-zinc-400 flex-shrink-0"/>
        </div>
        <div className="px-3 pb-2">
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{(caption||"Your professional post content here...").slice(0,300)}{(caption||"").length>300?"\n\n...see more":""}</p>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="w-full" style={{ maxHeight: 180, objectFit: "cover" }}/>}
        <div className="px-3 py-1.5 flex justify-between text-[9px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-700">
          <span className="flex items-center gap-1">👍 ❤️ 💡 <span>523</span></span>
          <span>61 comments · 88 reposts</span>
        </div>
        <div className="px-2 py-1 grid grid-cols-4 border-t border-zinc-100 dark:border-zinc-700">
          {[{icon:ThumbsUp,l:"Like"},{icon:MessageCircle,l:"Comment"},{icon:Repeat2,l:"Repost"},{icon:Send,l:"Send"}].map(({icon:Icon,l})=>(
            <button key={l} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              <Icon className="h-4 w-4 text-zinc-500"/>
              <span className="text-[9px] text-zinc-500 font-medium">{l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

// ─── LinkedIn Carousel ────────────────────────────────────────────
const LinkedInCarouselPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <BrowserFrame brandColor="#0077B5">
    <div className="bg-[#f3f2ef] dark:bg-zinc-900 p-3">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 flex gap-2 items-center">
          <div className="h-10 w-10 rounded-full bg-[#0077B5] flex items-center justify-center text-white text-sm font-bold">{(authorName||"U")[0]}</div>
          <div>
            <p className="text-xs font-semibold">{authorName||"Team Member"}</p>
            <p className="text-[9px] text-zinc-400">Just now · 🌐</p>
          </div>
        </div>
        <p className="px-3 text-xs text-zinc-600 dark:text-zinc-300 pb-2 leading-relaxed">{(caption||"Carousel post caption...").slice(0,100)}</p>
        {/* Slide */}
        <div className="relative h-48 flex items-center justify-center" style={{ background: imageUrl ? undefined : "linear-gradient(135deg,#dbeafe,#bfdbfe)" }}>
          {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover absolute inset-0"/> : null}
          <div className="relative z-10 text-center px-6">
            <p className="text-5xl font-black text-[#0077B5] drop-shadow">01</p>
            <p className="text-sm font-semibold text-zinc-800 mt-1">Slide 1 of 5</p>
            <p className="text-xs text-zinc-500 mt-0.5">Swipe to continue →</p>
          </div>
          {/* arrows */}
          <button className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white shadow flex items-center justify-center text-[#0077B5] font-bold">›</button>
          {/* dots */}
          <div className="absolute bottom-2 flex gap-1 left-1/2 -translate-x-1/2">
            {[1,2,3,4,5].map(i=><div key={i} className={`h-1.5 rounded-full ${i===1?"w-4 bg-[#0077B5]":"w-1.5 bg-[#0077B5]/30"}`}/>)}
          </div>
        </div>
        <div className="px-2 py-1 grid grid-cols-4 border-t border-zinc-100 dark:border-zinc-700">
          {[{icon:ThumbsUp,l:"Like"},{icon:MessageCircle,l:"Comment"},{icon:Repeat2,l:"Repost"},{icon:Send,l:"Send"}].map(({icon:Icon,l})=>(
            <button key={l} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <Icon className="h-4 w-4 text-zinc-500"/>
              <span className="text-[9px] text-zinc-500">{l}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

// ─── X (Twitter) Post — proper dark, X-branded card ──────────────
const XPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ width: 320, background: "#000" }}>
    {/* X top bar */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
      <span className="text-white font-bold text-sm">Home</span>
      {/* X logo */}
      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      <div className="h-7 w-7 rounded-full bg-zinc-700"/>
    </div>
    {/* post */}
    <div className="px-4 py-3 flex gap-3">
      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {(authorName||"U")[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-white text-sm font-bold">{authorName||"Team Member"}</span>
          {/* checkmark */}
          <svg className="h-4 w-4 text-[#1D9BF0]" fill="currentColor" viewBox="0 0 24 24"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12z"/></svg>
          <span className="text-zinc-500 text-xs">@{(authorName||"user").toLowerCase().replace(/\s+/g,"_")}</span>
        </div>
        <p className="text-white text-sm leading-relaxed">{(caption||"Your post on X...").slice(0,280)}</p>
        {imageUrl && <img src={imageUrl} alt="" className="w-full rounded-2xl mt-2 border border-zinc-800"/>}
        {/* engagement */}
        <div className="flex justify-between mt-3 text-zinc-500">
          {[{icon:MessageCircle,n:"24"},{icon:Repeat2,n:"97"},{icon:Heart,n:"412"},{icon:Share2,n:""}].map(({icon:Icon,n},i)=>(
            <button key={i} className="flex items-center gap-1 hover:text-[#1D9BF0] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                <Icon className="h-4 w-4"/>
              </div>
              {n && <span className="text-xs">{n}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
    <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center gap-2">
      <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs">{(authorName||"U")[0]}</div>
      <div className="flex-1 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center px-3">
        <span className="text-zinc-500 text-xs">Post your reply</span>
      </div>
    </div>
  </div>
);

// ─── Facebook Post ─────────────────────────────────────────────────
const FacebookPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <BrowserFrame brandColor="#1877F2">
    <div className="bg-[#f0f2f5] dark:bg-zinc-900 p-3">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
        <div className="p-3 flex gap-2">
          <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(authorName||"U")[0]}
          </div>
          <div>
            <p className="text-sm font-semibold">{authorName||"Team Member"}</p>
            <div className="flex items-center gap-1 text-[9px] text-zinc-400 mt-0.5">
              <span>Just now ·</span>
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
              <span>Public</span>
            </div>
          </div>
          <MoreHorizontal className="h-5 w-5 text-zinc-400 ml-auto"/>
        </div>
        <p className="px-3 pb-2 text-sm leading-relaxed">{(caption||"Your Facebook post...").slice(0,200)}</p>
        {imageUrl && <img src={imageUrl} alt="" className="w-full" style={{ maxHeight: 200, objectFit: "cover" }}/>}
        <div className="px-3 py-1.5 flex justify-between text-[10px] text-zinc-400 border-b border-zinc-100 dark:border-zinc-700">
          <span>👍 ❤️ 😮 178</span><span>23 comments · 41 shares</span>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-700">
          {[{icon:ThumbsUp,l:"Like",c:"hover:text-[#1877F2]"},{icon:MessageCircle,l:"Comment",c:""},{icon:Share2,l:"Share",c:""}].map(({icon:Icon,l,c})=>(
            <button key={l} className={`flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-500 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors ${c}`}>
              <Icon className="h-4 w-4"/>{l}
            </button>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

// ─── YouTube Video ─────────────────────────────────────────────────
const YouTubePreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <BrowserFrame brandColor="#FF0000">
    <div className="bg-[#0f0f0f]">
      {/* video */}
      <div className="relative" style={{ aspectRatio:"16/9" }}>
        {imageUrl
          ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
          : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a0000,#3d0000)" }}>
              <div className="h-16 w-16 rounded-full bg-[#FF0000] flex items-center justify-center shadow-2xl">
                <Play className="h-8 w-8 text-white fill-white ml-1"/>
              </div>
            </div>
        }
        {/* play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer">
          <div className="h-14 w-14 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm">
            <Play className="h-7 w-7 text-white fill-white ml-1"/>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">2:47</div>
        {/* progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
          <div className="h-full w-1/3 bg-[#FF0000]"/>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-0 h-3 w-3 rounded-full bg-[#FF0000]" style={{ right: "66%" }}/>
        </div>
      </div>
      {/* meta */}
      <div className="p-3 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-[#FF0000] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(authorName||"U")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{caption?.slice(0,80) || "Video Title Appears Here"}</p>
          <p className="text-zinc-400 text-xs mt-1">{authorName||"Channel"} · 0 views · Just now</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-400 flex-shrink-0"/>
      </div>
    </div>
  </BrowserFrame>
);

// ─── TikTok Video ─────────────────────────────────────────────────
const TikTokPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <PhoneFrame bg="#000">
    <div className="absolute inset-0">
      {imageUrl
        ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#010101 0%,#1a1a2e 50%,#16213e 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-50">🎵</div>
            </div>
          </div>
      }
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%)" }}/>
      {/* top */}
      <div className="absolute top-8 left-3 right-3 flex items-center justify-center z-10">
        <span className="text-white font-bold text-sm">Following</span>
        <span className="text-white/50 text-sm mx-3">|</span>
        <span className="text-white font-bold text-sm border-b-2 border-white pb-0.5">For You</span>
      </div>
      {/* right actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-white overflow-hidden bg-zinc-700 flex items-center justify-center text-white text-sm font-bold">
            {(authorName||"U")[0]}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white text-xs font-bold">+</div>
        </div>
        {[{icon:Heart,n:"14.2k"},{icon:MessageCircle,n:"94"},{icon:Bookmark,n:"2.1k"},{icon:Share2,n:"Share"}].map(({icon:Icon,n},i)=>(
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Icon className="h-7 w-7 text-white drop-shadow-lg"/>
            <span className="text-white text-[9px] font-medium">{n}</span>
          </div>
        ))}
        {/* spinning disc */}
        <div className="h-10 w-10 rounded-full border-4 border-zinc-600 bg-zinc-800 flex items-center justify-center border-t-white animate-spin" style={{ animationDuration: "3s" }}>
          <div className="h-3 w-3 rounded-full bg-white"/>
        </div>
      </div>
      {/* bottom */}
      <div className="absolute bottom-4 left-3 right-16 z-10">
        <p className="text-white text-xs font-bold mb-1">@{(authorName||"user").toLowerCase().replace(/\s+/g,"")}</p>
        <p className="text-white/90 text-[10px] leading-relaxed line-clamp-2">{caption||"Your TikTok caption here 🔥 #fyp #viral"}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[9px] text-white/70">♪</span>
          <div className="flex-1 h-px bg-white/30"/>
          <span className="text-[9px] text-white/70">Original Sound · {authorName||"creator"}</span>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// ─── YouTube Shorts (9:16 phone frame, YouTube-branded) ──────────
const YouTubeShortsPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <PhoneFrame bg="#000">
    <div className="absolute inset-0">
      {imageUrl
        ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a0000 0%,#3d0000 50%,#000 100%)" }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-[#FF0000] flex items-center justify-center shadow-2xl">
                <Play className="h-8 w-8 text-white fill-white ml-1"/>
              </div>
            </div>
          </div>
      }
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)" }}/>
      {/* YouTube top bar */}
      <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-auto" viewBox="0 0 90 20" fill="none">
            <path d="M27.9 3.1a3.2 3.2 0 0 0-2.2-2.2C23.6 0 14.6 0 14.6 0S5.6 0 3.4.9A3.2 3.2 0 0 0 1.2 3.1C.3 5.3.3 10 .3 10s0 4.7.9 6.9a3.2 3.2 0 0 0 2.2 2.2c2.2.9 11.2.9 11.2.9s9 0 11.2-.9a3.2 3.2 0 0 0 2.2-2.2c.9-2.2.9-6.9.9-6.9s0-4.7-.9-6.9z" fill="#FF0000"/>
            <path d="M11.8 14.3l7.4-4.3-7.4-4.3v8.6z" fill="#fff"/>
          </svg>
          <span className="text-white text-[10px] font-bold">Shorts</span>
        </div>
        <div className="h-2 w-2 rounded-full bg-white/60"/>
      </div>
      {/* Right actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {[{icon:Heart,n:"14.2k"},{icon:MessageCircle,n:"Share"},{icon:Share2,n:"More"}].map(({icon:Icon,n},i)=>(
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Icon className="h-6 w-6 text-white drop-shadow"/>
            <span className="text-white text-[9px] font-medium">{n}</span>
          </div>
        ))}
      </div>
      {/* Bottom */}
      <div className="absolute bottom-5 left-3 right-14 z-10">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-8 w-8 rounded-full border-2 border-white bg-[#FF0000] flex items-center justify-center text-white text-xs font-bold">{(authorName||"U")[0]}</div>
          <p className="text-white text-[10px] font-bold">{authorName||"Creator"}</p>
          <span className="text-white text-[9px] border border-white/60 rounded px-1.5 py-0.5 ml-1">Subscribe</span>
        </div>
        <p className="text-white text-[10px] leading-relaxed line-clamp-3">{caption||"Your YouTube Short caption... #Shorts"}</p>
        {/* Progress bar */}
        <div className="mt-3 h-0.5 rounded-full bg-white/30">
          <div className="h-full w-1/3 rounded-full bg-[#FF0000]"/>
        </div>
      </div>
    </div>
  </PhoneFrame>
);

// ─── Main dispatcher ───────────────────────────────────────────────
export const PostPreview = (props: PostPreviewProps) => {
  const { platform, postType } = props;
  switch (platform) {
    case "instagram":
      if (postType === "reel")    return <IGReelPreview {...props}/>;
      if (postType === "story")   return <IGStoryPreview {...props}/>;
      return <IGPostPreview {...props}/>;
    case "linkedin":
      if (postType === "carousel") return <LinkedInCarouselPreview {...props}/>;
      return <LinkedInPostPreview {...props}/>;
    case "x":      return <XPostPreview {...props}/>;
    case "twitter":return <XPostPreview {...props}/>;        // alias
    case "facebook":return <FacebookPostPreview {...props}/>;
    case "youtube":
      if (postType === "short") return <YouTubeShortsPreview {...props}/>;
      return <YouTubePreview {...props}/>;
    case "tiktok":  return <TikTokPreview {...props}/>;
    default:        return <LinkedInPostPreview {...props}/>;
  }
};
