/**
 * PostPreview — pixel-perfect, large platform mockups.
 * Each platform/format has a completely distinct visual identity.
 */
import React, { useState } from "react";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Share2, Play, Send, Plus, Search, Youtube, SmartphoneIcon, Monitor, Newspaper, Film, BookImage, LayoutGrid, Video, AlignLeft } from "lucide-react";
import companyLogo from "@/assets/company-logo.png";

// ─── Media Renderer for Images & Video ────────────────────────────
const MediaRenderer = ({ url, className, style, isVideoFormat, format }: { url?: string | null; className?: string; style?: React.CSSProperties; isVideoFormat?: boolean; format?: "grid" | "single" }) => {
  if (!url) return null;
  const urls = url.split(',').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) return null;

  const getEmbedUrl = (link: string) => {
    // YouTube
    const ytMatch = link.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`;
    
    // TikTok
    const ttMatch = link.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/)(\d+)/) || link.match(/video\/(\d+)/);
    if (ttMatch) return `https://www.tiktok.com/embed/v2/${ttMatch[1]}`;
    
    // TikTok shortened fallback
    if (link.includes("tiktok.com") && !link.includes("video")) {
       const idMatch = link.match(/tiktok\.com\/(\d+)/);
       if (idMatch) return `https://www.tiktok.com/embed/v2/${idMatch[1]}`;
    }

    // Vimeo
    const vmMatch = link.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1`;

    return null;
  };

  const renderSingle = (u: string, classes: string, s: React.CSSProperties = {}) => {
    const embedUrl = getEmbedUrl(u);
    if (embedUrl) {
      return (
        <iframe 
          src={embedUrl}
          className={classes}
          style={{ border: 0, ...s }}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }

    const isVideo = isVideoFormat || u.match(/\.(mp4|mov|webm)$/i) || u.includes("video") || u.includes("reel") || u.includes("short");
    if (isVideo) {
      return <video src={u} className={classes} style={{ objectFit: 'cover', ...s }} autoPlay loop muted playsInline controls />;
    }
    return <img src={u} alt="" className={classes} style={{ objectFit: 'cover', ...s }} />;
  };

  if (urls.length === 1) {
    return renderSingle(urls[0], className || "w-full h-full object-cover", style);
  }

  const gridClasses = "grid-cols-2";
  return (
    <div className={`grid ${gridClasses} gap-0.5 w-full h-full overflow-hidden ${className || ""}`} style={style}>
      {urls.slice(0, 4).map((u, i) => (
        <div key={i} className="relative w-full h-full" style={{ minHeight: urls.length > 2 && i === 0 ? "100%" : "auto", gridRow: urls.length === 3 && i === 0 ? "span 2" : "auto" }}>
          {renderSingle(u, "absolute inset-0 w-full h-full object-cover")}
        </div>
      ))}
    </div>
  );
};

// ─── Company Avatar ───────────────────────────────────────────────
const CompanyAvatar = ({ className }: { className?: string }) => (
  <img src={companyLogo} alt="REDtech" className={`object-cover rounded-full bg-white ${className || ""}`} />
);

export interface PostPreviewProps {
  platform: string;
  postType: string;
  caption: string;
  imageUrl?: string | null;
  authorName: string;
  scheduledDate?: string;
}

const handle = (p: string) => {
  const handles: Record<string, string> = {
    instagram: "@REDtechAfrica",
    tiktok: "@redtechafrica",
    x: "@REDtech_Africa",
    linkedin: "REDtech Africa",
    youtube: "REDtech Africa",
    facebook: "REDtech Africa"
  };
  return handles[p] || "@REDtechAfrica";
};

// ─── Phone frame ──────────
const PhoneFrame = ({ children, bg = "#000" }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative mx-auto" style={{ width: 260, height: 520 }}>
    <div className="absolute inset-0 rounded-[36px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden" style={{ background: bg }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-b-2xl z-20"/>
      <div className="absolute inset-0 overflow-hidden">{children}</div>
    </div>
    <div className="absolute right-[-10px] top-20 w-1.5 h-10 bg-zinc-700 rounded-r-sm"/>
    <div className="absolute left-[-10px] top-16 w-1.5 h-8 bg-zinc-700 rounded-l-sm"/>
    <div className="absolute left-[-10px] top-28 w-1.5 h-8 bg-zinc-700 rounded-l-sm"/>
  </div>
);

// ─── Browser frame ──────────
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
const IGReelPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        {imageUrl
          ? <MediaRenderer url={imageUrl} className="w-full h-full object-cover" isVideoFormat/>
          : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }} />
        }
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-10" onClick={() => setPlaying(true)}>
            <div className="h-16 w-16 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-md shadow-2xl">
               <Play className="h-8 w-8 text-white fill-white ml-1"/>
            </div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)" }}/>
        <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="text-white font-bold text-sm tracking-widest">Reels</span>
          <div className="flex gap-1">
            {[0,1,2].map(i => <div key={i} className={`h-0.5 w-6 rounded-full ${i===1?"bg-white":"bg-white/40"}`}/>)}
          </div>
        </div>
        <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-5 pointer-events-none">
          <div className="relative">
            <div className="h-9 w-9 rounded-full border-2 border-white overflow-hidden" style={{ background: "linear-gradient(135deg,#833ab4,#fcb045)" }}>
              <CompanyAvatar className="w-full h-full"/>
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#E1306C] flex items-center justify-center text-white text-[10px] font-bold">+</div>
          </div>
          {[{icon:Heart,n:"14.2k"},{icon:MessageCircle,n:"94"},{icon:Send,n:"Share"}].map(({icon:Icon,n},i)=>(
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Icon className="h-6 w-6 text-white drop-shadow-lg"/>
              {n && <span className="text-white text-[9px] font-medium drop-shadow">{n}</span>}
            </div>
          ))}
        </div>
        <div className="absolute bottom-6 left-3 right-14 z-10 pointer-events-none">
          <p className="text-white font-semibold text-xs mb-1">REDtech Africa</p>
          <p className="text-white/90 text-[10px] leading-relaxed line-clamp-3">{caption || "Your reel caption here ✨ #reels #redtechafrica"}</p>
        </div>
      </div>
    </PhoneFrame>
  );
};

// ─── Instagram Story (9:16 phone) ─────────────────────────────────
const IGStoryPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <PhoneFrame bg="#000">
    <div className="absolute inset-0">
      {imageUrl
        ? <MediaRenderer url={imageUrl} className="w-full h-full object-cover" isVideoFormat/>
        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}/>
      }
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)" }}/>
      <div className="absolute top-8 left-3 right-3 flex gap-1 z-10">
        {[1,2,3].map(i=><div key={i} className={`h-[2px] flex-1 rounded-full ${i===2?"bg-white":"bg-white/40"}`}/>)}
      </div>
      <div className="absolute top-14 left-3 right-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full p-0.5" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }}>
            <CompanyAvatar className="w-full h-full"/>
          </div>
          <span className="text-white text-[10px] font-semibold">{handle("instagram")}</span>
        </div>
      </div>
      <div className="absolute bottom-8 left-3 right-3 z-10">
        {caption && <p className="text-white text-[10px] text-center mb-3 px-4 leading-relaxed bg-black/30 rounded-xl py-2 backdrop-blur-sm">{caption}</p>}
      </div>
    </div>
  </PhoneFrame>
);

// ─── Instagram Post (feed card) ───────────────────────────────────
const IGPostPreview = ({ caption, imageUrl, authorName, postType }: PostPreviewProps) => {
  const isPortrait = postType === "portrait";
  return (
    <div className="mx-auto bg-white dark:bg-zinc-900 shadow-2xl" style={{ width: 320, borderRadius: 0 }}>
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <CompanyAvatar className="h-8 w-8"/>
          <div>
            <p className="text-xs font-semibold leading-none">{handle("instagram")}</p>
            <p className="text-[9px] text-zinc-400 mt-0.5">REDtech Africa</p>
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400"/>
      </div>
      <div style={{ height: isPortrait ? 380 : 320, background: imageUrl ? undefined : "linear-gradient(135deg,#fce3ec,#ffd6e7)" }}>
        <MediaRenderer url={imageUrl} className="w-full h-full object-cover"/>
      </div>
      <div className="px-3 pt-2">
        <div className="flex items-center gap-4 mb-1.5">
          <Heart className="h-6 w-6"/><MessageCircle className="h-6 w-6"/><Share2 className="h-6 w-6"/>
        </div>
        <p className="text-xs font-bold mb-1">1,245 likes</p>
        <p className="text-xs pb-2 leading-relaxed">
          <span className="font-semibold">{handle("instagram")}</span> <span className="text-zinc-600 dark:text-zinc-400">{caption}</span>
        </p>
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
          <CompanyAvatar className="h-11 w-11 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">REDtech Africa</p>
            <p className="text-[10px] text-zinc-500 truncate">Social Media Manager · REDtech Africa</p>
            <p className="text-[9px] text-zinc-400 mt-0.5">Just now · 🌐</p>
          </div>
        </div>
        <div className="px-3 pb-2 text-xs leading-relaxed whitespace-pre-wrap">{caption}</div>
        {imageUrl && <MediaRenderer url={imageUrl} className="w-full" style={{ maxHeight: 300, objectFit: "cover" }}/>}
        <div className="px-3 py-1.5 flex justify-between text-[9px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-700">
          <span>👍 ❤️ 523</span><span>61 comments · 88 reposts</span>
        </div>
        <div className="px-2 py-1 grid grid-cols-4 border-t border-zinc-100 dark:border-zinc-700">
          {[{icon:ThumbsUp,l:"Like"},{icon:MessageCircle,l:"Comment"},{icon:Repeat2,l:"Repost"},{icon:Send,l:"Send"}].map(({icon:Icon,l})=>(
            <button key={l} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              <Icon className="h-4 w-4 text-zinc-500"/><span className="text-[9px] text-zinc-500 font-medium">{l}</span>
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
          <CompanyAvatar className="h-10 w-10"/>
          <div><p className="text-xs font-semibold">REDtech Africa</p><p className="text-[9px] text-zinc-400">Just now · 🌐</p></div>
        </div>
        <p className="px-3 text-xs text-zinc-600 dark:text-zinc-300 pb-2 leading-relaxed">{caption?.slice(0,100)}</p>
        <div className="relative h-48 bg-zinc-100">
          {imageUrl ? <MediaRenderer url={imageUrl} className="w-full h-full object-cover"/> : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/5"><p className="text-sm font-bold opacity-30">Slide 1 of 5</p></div>
          <div className="absolute bottom-2 flex gap-1 left-1/2 -translate-x-1/2">
            {[1,2,3,4,5].map(i=><div key={i} className={`h-1.5 rounded-full ${i===1?"w-4 bg-[#0077B5]":"w-1.5 bg-[#0077B5]/30"}`}/>)}
          </div>
        </div>
      </div>
    </div>
  </BrowserFrame>
);

// ─── X (Twitter) Post ──────────────
const XPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ width: 320, background: "#000" }}>
    <div className="px-4 py-3 flex gap-3">
      <CompanyAvatar className="h-10 w-10 flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-white text-sm font-bold">REDtech Africa</span>
          <span className="text-zinc-500 text-xs">{handle("x")}</span>
        </div>
        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
        {imageUrl && <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-800" style={{ maxHeight: 290 }}><MediaRenderer url={imageUrl} className="w-full h-full object-cover"/></div>}
        <div className="flex justify-between mt-3 text-zinc-500">
          {[MessageCircle, Repeat2, Heart, Share2].map((Icon, i) => <Icon key={i} className="h-4 w-4 hover:text-[#1D9BF0] cursor-pointer"/>)}
        </div>
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
          <CompanyAvatar className="h-10 w-10 flex-shrink-0"/>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">REDtech Africa</p><p className="text-[9px] text-zinc-400">Just now · 🌐 Public</p></div>
        </div>
        <p className="px-3 pb-2 text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
        {imageUrl && <div style={{ maxHeight: 300, minHeight: 200 }} className="flex"><MediaRenderer url={imageUrl} className="w-full flex-1"/></div>}
        <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:border-zinc-700 border-t border-zinc-100 dark:border-zinc-700">
          {[{icon:ThumbsUp,l:"Like"},{icon:MessageCircle,l:"Comment"},{icon:Share2,l:"Share"}].map(({icon:Icon,l})=>(
            <button key={l} className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-500 font-medium hover:bg-zinc-50 transition-colors"><Icon className="h-4 w-4"/>{l}</button>
          ))}
        </div>
      </div>
    </div>
  </BrowserFrame>
);

// ─── YouTube Video ─────────────────────────────────────────────────
const YouTubePreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  return (
    <BrowserFrame brandColor="#FF0000">
      <div className="bg-[#0f0f0f]">
        <div className="relative" style={{ aspectRatio:"16/9" }}>
          <MediaRenderer url={imageUrl} className="w-full h-full object-cover" isVideoFormat/>
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-10" onClick={() => setPlaying(true)}>
              <div className="h-14 w-14 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm">
                <Play className="h-7 w-7 text-white fill-white ml-1"/>
              </div>
            </div>
          )}
        </div>
        <div className="p-3 flex gap-3">
          <CompanyAvatar className="h-9 w-9 flex-shrink-0"/>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{caption || "Video Title Appears Here"}</p>
            <p className="text-zinc-400 text-xs mt-1">REDtech Africa · Just now</p>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
};

// ─── TikTok Video ─────────────────────────────────────────────────
const TikTokPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        <MediaRenderer url={imageUrl} className="w-full h-full object-cover" isVideoFormat/>
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-10" onClick={() => setPlaying(true)}>
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md shadow-2xl">
               <Play className="h-8 w-8 text-white fill-white ml-1"/>
            </div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)" }}/>
        <div className="absolute right-2 bottom-24 flex flex-col gap-5 items-center z-10 pointer-events-none">
          <CompanyAvatar className="h-10 w-10 border-2 border-white"/>
          <div className="flex flex-col items-center"><Heart className="h-7 w-7 text-white fill-white"/><span className="text-[10px] text-white font-medium">145k</span></div>
          <div className="flex flex-col items-center"><MessageCircle className="h-7 w-7 text-white fill-white"/><span className="text-[10px] text-white font-medium">2.3k</span></div>
        </div>
        <div className="absolute bottom-6 left-3 right-12 text-white z-10 pointer-events-none">
          <p className="font-bold text-sm mb-1">{handle("tiktok")}</p>
          <p className="text-white/9 text-[10px] line-clamp-2">{caption}</p>
        </div>
      </div>
    </PhoneFrame>
  );
};

// ─── YouTube Shorts ──────────────────────────────────────────────
const YouTubeShortsPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        <MediaRenderer url={imageUrl} className="w-full h-full object-cover" isVideoFormat/>
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer z-10" onClick={() => setPlaying(true)}>
            <div className="h-16 w-16 rounded-full bg-[#FF0000]/60 flex items-center justify-center backdrop-blur-md shadow-2xl">
               <Play className="h-8 w-8 text-white fill-white ml-1"/>
            </div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)" }}/>
        <div className="absolute top-8 left-3 z-10 pointer-events-none flex items-center gap-1.5">
          <Youtube className="h-4 w-4 text-white fill-white" />
          <span className="text-white font-bold text-xs">Shorts</span>
        </div>
        <div className="absolute bottom-5 left-3 right-14 z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-1.5">
            <CompanyAvatar className="h-8 w-8"/><span className="text-white text-xs font-bold">{handle("youtube")}</span>
          </div>
          <p className="text-white text-[10px] leading-relaxed line-clamp-3">{caption}</p>
        </div>
      </div>
    </PhoneFrame>
  );
};

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
    case "twitter":return <XPostPreview {...props}/>;
    case "facebook":return <FacebookPostPreview {...props}/>;
    case "youtube":
      if (postType === "short") return <YouTubeShortsPreview {...props}/>;
      return <YouTubePreview {...props}/>;
    case "tiktok":  return <TikTokPreview {...props}/>;
    default:        return <LinkedInPostPreview {...props}/>;
  }
};
