/**
 * PostPreview — pixel-perfect, platform-matching social media mockups.
 * Multi-image handling matches each real platform's behaviour.
 * 
 * Platform image rules (2025):
 * ── Instagram Post/Carousel: sequential carousel with dots (one image at a time)
 * ── Instagram Story/Reel: single full-screen 9:16
 * ── Facebook: 1 img full-width, 2 side-by-side, 3+ = grid with "+N" overlay
 * ── X (Twitter): 1 img rounded, 2 side-by-side, 3 = 1 large + 2 stacked, 4 = 2×2
 * ── LinkedIn: single or carousel
 * ── YouTube / TikTok: single video/thumbnail (9:16 or 16:9)
 */
import React, { useState } from "react";
import { Heart, MessageCircle, MoreHorizontal, ThumbsUp, Repeat2, Share2, Play, Pause, Send, Youtube, ChevronLeft, ChevronRight, Maximize2, Volume2, VolumeX, Bookmark } from "lucide-react";
import companyLogo from "@/assets/company-logo.png";

/* ╔════════════════════════════════════════════════════════════════╗
   ║                    MEDIA RENDER HELPERS                       ║
   ╚════════════════════════════════════════════════════════════════╝ */

/** Checks if URL points to an embeddable platform and returns embed src */
const getEmbedUrl = (link: string) => {
  const yt = link.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}`;
  const tt = link.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/(?:v2\/)?|video\/)(\d+)/) || link.match(/\/video\/(\d+)/);
  if (tt) return `https://www.tiktok.com/embed/${tt[1]}`;
  if (link.includes("tiktok.com")) { const id = link.match(/(\d{15,})/); if (id) return `https://www.tiktok.com/embed/${id[1]}`; }
  const vm = link.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1`;
  return null;
};

/** Helper to determine if a URL should render as a video */
const isLikelyVideo = (src: string, isVideoHint?: boolean) => {
  const isBlob = src.startsWith("blob:") || src.startsWith("data:");
  const hasVidExt = /\.(mp4|mov|webm|ogg)(\?|$)/i.test(src);
  const hasImgExt = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?|$)/i.test(src);
  return hasVidExt || (!isBlob && !hasImgExt && isVideoHint);
};

/** Renders a single media URL — embed, video, or image (smart detection) */
const RenderMedia = ({ src, className = "", style, isVideoHint }: { src: string; className?: string; style?: React.CSSProperties; isVideoHint?: boolean }) => {
  const embed = getEmbedUrl(src);
  if (embed) return <iframe src={embed} className={className} style={{ border: 0, ...style }} allow="autoplay; encrypted-media; picture-in-picture" sandbox="allow-scripts allow-same-origin allow-popups" title="Video" allowFullScreen />;
  if (isLikelyVideo(src, isVideoHint)) return <video src={src} className={className} style={{ objectFit: "cover", ...style }} autoPlay loop muted playsInline />;
  return <img src={src} alt="" className={className} style={{ objectFit: "cover", ...style }} />;
};

/** Carousel: swipe through images one by one with arrows + dots (Instagram / LinkedIn style) */
const CarouselMedia = ({ urls, className = "", style, height }: { urls: string[]; className?: string; style?: React.CSSProperties; height?: number }) => {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx(i => (i > 0 ? i - 1 : urls.length - 1));
  const next = () => setIdx(i => (i < urls.length - 1 ? i + 1 : 0));
  return (
    <div className={`relative group overflow-hidden ${className}`} style={{ height, ...style }}>
      <RenderMedia src={urls[idx]} className="w-full h-full object-cover" />
      {urls.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={next} className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-20">
            {urls.map((_, i) => <div key={i} className={`rounded-full transition-all ${i === idx ? "h-1.5 w-4 bg-white" : "h-1.5 w-1.5 bg-white/50"}`} />)}
          </div>
        </>
      )}
    </div>
  );
};

/** Facebook-style multi-image grid */
const FBImageGrid = ({ urls, height = 260 }: { urls: string[]; height?: number }) => {
  if (urls.length === 1) return <RenderMedia src={urls[0]} className="w-full object-cover" style={{ maxHeight: height }} />;
  if (urls.length === 2) return (
    <div className="grid grid-cols-2 gap-0.5" style={{ height }}>
      {urls.map((u, i) => <RenderMedia key={i} src={u} className="w-full h-full object-cover" />)}
    </div>
  );
  // 3+: first image large, rest stacked on right
  return (
    <div className="grid grid-cols-2 gap-0.5" style={{ height }}>
      <div className="row-span-2"><RenderMedia src={urls[0]} className="w-full h-full object-cover" /></div>
      <div><RenderMedia src={urls[1]} className="w-full h-full object-cover" /></div>
      <div className="relative">
        <RenderMedia src={urls[2]} className="w-full h-full object-cover" />
        {urls.length > 3 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">+{urls.length - 3}</div>}
      </div>
    </div>
  );
};

/** X (Twitter) style multi-image grid */
const XImageGrid = ({ urls }: { urls: string[] }) => {
  if (urls.length === 1) return <RenderMedia src={urls[0]} className="w-full rounded-2xl object-cover" style={{ maxHeight: 280 }} />;
  if (urls.length === 2) return (
    <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden" style={{ height: 200 }}>
      {urls.map((u, i) => <RenderMedia key={i} src={u} className="w-full h-full object-cover" />)}
    </div>
  );
  if (urls.length === 3) return (
    <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden" style={{ height: 200 }}>
      <div className="row-span-2"><RenderMedia src={urls[0]} className="w-full h-full object-cover" /></div>
      <div><RenderMedia src={urls[1]} className="w-full h-full object-cover" /></div>
      <div><RenderMedia src={urls[2]} className="w-full h-full object-cover" /></div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl overflow-hidden" style={{ height: 200 }}>
      {urls.slice(0, 4).map((u, i) => (
        <div key={i} className="relative"><RenderMedia src={u} className="w-full h-full object-cover" />
          {i === 3 && urls.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">+{urls.length - 4}</div>}
        </div>
      ))}
    </div>
  );
};

/** Parse comma-separated URL string */
const parseUrls = (url?: string | null) => (url || "").split(",").map(u => u.trim()).filter(Boolean);

/* ╔════════════════════════════════════════════════════════════════╗
   ║                        SHARED UI                              ║
   ╚════════════════════════════════════════════════════════════════╝ */

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

const handle = (p: string) => ({ instagram: "@REDtechAfrica", tiktok: "@redtechafrica", x: "@REDtech_Africa", linkedin: "REDtech Africa", youtube: "REDtech Africa", facebook: "REDtech Africa" }[p] || "@REDtechAfrica");

// ─── Phone frame ───
const PhoneFrame = ({ children, bg = "#000" }: { children: React.ReactNode; bg?: string }) => (
  <div className="relative mx-auto" style={{ width: 260, height: 520 }}>
    <div className="absolute inset-0 rounded-[36px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden" style={{ background: bg }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-b-2xl z-20" />
      <div className="absolute inset-0 overflow-hidden">{children}</div>
    </div>
    <div className="absolute right-[-10px] top-20 w-1.5 h-10 bg-zinc-700 rounded-r-sm" />
    <div className="absolute left-[-10px] top-16 w-1.5 h-8 bg-zinc-700 rounded-l-sm" />
    <div className="absolute left-[-10px] top-28 w-1.5 h-8 bg-zinc-700 rounded-l-sm" />
  </div>
);

// ─── Browser frame ───
const BrowserFrame = ({ children, brandColor = "#0077B5" }: { children: React.ReactNode; brandColor?: string }) => (
  <div className="mx-auto rounded-xl overflow-hidden shadow-2xl border border-border/30" style={{ width: 360 }}>
    <div className="flex items-center gap-2 px-3 py-2" style={{ background: brandColor }}>
      <div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-red-400" /><div className="h-2.5 w-2.5 rounded-full bg-yellow-400" /><div className="h-2.5 w-2.5 rounded-full bg-green-400" /></div>
      <div className="flex-1 bg-white/20 rounded-md h-4 mx-2" />
    </div>
    {children}
  </div>
);

// ─── Video play overlay (reusable) ───
const PlayOverlay = ({ playing, onToggle, accent = "bg-white/30" }: { playing: boolean; onToggle: () => void; accent?: string }) => (
  <div className="absolute inset-0 cursor-pointer z-10" onClick={onToggle}>
    {!playing ? (
      <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
        <div className={`h-14 w-14 rounded-full ${accent} flex items-center justify-center backdrop-blur-md shadow-2xl`}>
          <Play className="h-7 w-7 text-white fill-white ml-0.5" />
        </div>
      </div>
    ) : (
      <div className="absolute inset-0 group/play">
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transition-opacity bg-black/10">
          <div className={`h-14 w-14 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-md shadow-2xl`}>
            <Pause className="h-7 w-7 text-white fill-white" />
          </div>
        </div>
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover/play:opacity-100 transition-opacity">
          <div className="h-8 w-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"><Maximize2 className="h-3.5 w-3.5 text-white" /></div>
        </div>
      </div>
    )}
  </div>
);

/* ╔════════════════════════════════════════════════════════════════╗
   ║                  INSTAGRAM PREVIEWS                           ║
   ╚════════════════════════════════════════════════════════════════╝ */

const IGReelPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const urls = parseUrls(imageUrl);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        {urls.length > 0
          ? <RenderMedia src={urls[0]} className="w-full h-full object-cover" isVideoHint />
          : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)" }} />}
        <PlayOverlay playing={playing} onToggle={() => setPlaying(!playing)} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.25) 100%)" }} />
        <div className="absolute top-8 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <span className="text-white font-bold text-sm tracking-widest">Reels</span>
        </div>
        <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-4 pointer-events-none">
          <div className="relative">
            <div className="h-9 w-9 rounded-full border-2 border-white overflow-hidden" style={{ background: "linear-gradient(135deg,#833ab4,#fcb045)" }}><CompanyAvatar className="w-full h-full" /></div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#E1306C] flex items-center justify-center text-white text-[10px] font-bold">+</div>
          </div>
          {[{ icon: Heart, n: "14.2k" }, { icon: MessageCircle, n: "94" }, { icon: Send, n: "" }, { icon: Bookmark, n: "" }].map(({ icon: Icon, n }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5"><Icon className="h-6 w-6 text-white drop-shadow-lg" />{n && <span className="text-white text-[8px] font-medium">{n}</span>}</div>
          ))}
        </div>
        <div className="absolute bottom-5 left-3 right-14 z-10 pointer-events-none">
          <p className="text-white font-semibold text-xs mb-0.5">REDtech Africa</p>
          <p className="text-white/90 text-[10px] leading-relaxed line-clamp-2">{caption || "Your reel caption ✨"}</p>
        </div>
      </div>
    </PhoneFrame>
  );
};

const IGStoryPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        {urls.length > 0
          ? <CarouselMedia urls={urls} className="w-full h-full" />
          : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }} />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)" }} />
        <div className="absolute top-8 left-3 right-3 flex gap-1 z-10">
          {[1, 2, 3].map(i => <div key={i} className={`h-[2px] flex-1 rounded-full ${i === 2 ? "bg-white" : "bg-white/40"}`} />)}
        </div>
        <div className="absolute top-14 left-3 right-3 flex items-center z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full p-0.5" style={{ background: "linear-gradient(135deg,#f09433,#bc1888)" }}><CompanyAvatar className="w-full h-full" /></div>
            <span className="text-white text-[10px] font-semibold">{handle("instagram")}</span>
          </div>
        </div>
        {caption && <div className="absolute bottom-8 left-3 right-3 z-10"><p className="text-white text-[10px] text-center px-4 leading-relaxed bg-black/30 rounded-xl py-2 backdrop-blur-sm">{caption}</p></div>}
      </div>
    </PhoneFrame>
  );
};

const IGPostPreview = ({ caption, imageUrl, postType }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  const isPortrait = postType === "portrait";
  const h = isPortrait ? 380 : 320;
  return (
    <div className="mx-auto bg-white dark:bg-zinc-900 shadow-2xl" style={{ width: 320 }}>
      <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2"><CompanyAvatar className="h-8 w-8" /><div><p className="text-xs font-semibold leading-none">{handle("instagram")}</p><p className="text-[9px] text-zinc-400 mt-0.5">REDtech Africa</p></div></div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
      </div>
      <div style={{ height: h, background: urls.length === 0 ? "linear-gradient(135deg,#fce3ec,#ffd6e7)" : undefined }}>
        {urls.length > 0 && <CarouselMedia urls={urls} height={h} />}
      </div>
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-4"><Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6" /><Share2 className="h-6 w-6" /></div>
          <Bookmark className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold mb-1">1,245 likes</p>
        <p className="text-xs pb-2 leading-relaxed"><span className="font-semibold">{handle("instagram")}</span> <span className="text-zinc-600 dark:text-zinc-400">{caption}</span></p>
      </div>
    </div>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                   LINKEDIN PREVIEWS                           ║
   ╚════════════════════════════════════════════════════════════════╝ */

const LinkedInPostPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  return (
    <BrowserFrame brandColor="#0077B5">
      <div className="bg-[#f3f2ef] dark:bg-zinc-900 p-3">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
          <div className="p-3 flex gap-2.5">
            <CompanyAvatar className="h-11 w-11 flex-shrink-0" />
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">REDtech Africa</p><p className="text-[10px] text-zinc-500 truncate">Social Media · REDtech Africa</p><p className="text-[9px] text-zinc-400 mt-0.5">Just now · 🌐</p></div>
          </div>
          <div className="px-3 pb-2 text-xs leading-relaxed whitespace-pre-wrap line-clamp-4">{caption}</div>
          {urls.length === 1 && <RenderMedia src={urls[0]} className="w-full object-cover" style={{ maxHeight: 280 }} />}
          {urls.length > 1 && <CarouselMedia urls={urls} height={240} />}
          <div className="px-3 py-1.5 flex justify-between text-[9px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-700"><span>👍 ❤️ 255</span><span>61 comments · 88 reposts</span></div>
          <div className="px-2 py-1 grid grid-cols-4 border-t border-zinc-100 dark:border-zinc-700">
            {[{ icon: ThumbsUp, l: "Like" }, { icon: MessageCircle, l: "Comment" }, { icon: Repeat2, l: "Repost" }, { icon: Send, l: "Send" }].map(({ icon: Icon, l }) => (
              <button key={l} className="flex flex-col items-center gap-0.5 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"><Icon className="h-4 w-4 text-zinc-500" /><span className="text-[9px] text-zinc-500 font-medium">{l}</span></button>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
};

const LinkedInCarouselPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  return (
    <BrowserFrame brandColor="#0077B5">
      <div className="bg-[#f3f2ef] dark:bg-zinc-900 p-3">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 flex gap-2 items-center"><CompanyAvatar className="h-10 w-10" /><div><p className="text-xs font-semibold">REDtech Africa</p><p className="text-[9px] text-zinc-400">Just now · 🌐</p></div></div>
          <p className="px-3 text-xs text-zinc-600 dark:text-zinc-300 pb-2 leading-relaxed line-clamp-2">{caption}</p>
          <CarouselMedia urls={urls.length > 0 ? urls : ["placeholder"]} height={240} />
        </div>
      </div>
    </BrowserFrame>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                     X (TWITTER) PREVIEW                       ║
   ╚════════════════════════════════════════════════════════════════╝ */

const XPostPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  return (
    <div className="mx-auto rounded-2xl overflow-hidden shadow-2xl" style={{ width: 320, background: "#000" }}>
      <div className="px-4 py-3 flex gap-3">
        <CompanyAvatar className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5"><span className="text-white text-sm font-bold">REDtech Africa</span><span className="text-zinc-500 text-xs">{handle("x")}</span></div>
          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{caption}</p>
          {urls.length > 0 && <div className="mt-3"><XImageGrid urls={urls} /></div>}
          <div className="flex justify-between mt-3 text-zinc-500">{[MessageCircle, Repeat2, Heart, Share2].map((Icon, i) => <Icon key={i} className="h-4 w-4 hover:text-[#1D9BF0] cursor-pointer" />)}</div>
        </div>
      </div>
    </div>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                  FACEBOOK PREVIEW                             ║
   ╚════════════════════════════════════════════════════════════════╝ */

const FacebookPostPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const urls = parseUrls(imageUrl);
  return (
    <BrowserFrame brandColor="#1877F2">
      <div className="bg-[#f0f2f5] dark:bg-zinc-900 p-3">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
          <div className="p-3 flex gap-2"><CompanyAvatar className="h-10 w-10 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">REDtech Africa</p><p className="text-[9px] text-zinc-400">Just now · 🌐 Public</p></div></div>
          {caption && <p className="px-3 pb-2 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{caption}</p>}
          {urls.length > 0 && <FBImageGrid urls={urls} />}
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-700 border-t border-zinc-100 dark:border-zinc-700">
            {[{ icon: ThumbsUp, l: "Like" }, { icon: MessageCircle, l: "Comment" }, { icon: Share2, l: "Share" }].map(({ icon: Icon, l }) => (
              <button key={l} className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-500 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"><Icon className="h-4 w-4" />{l}</button>
            ))}
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                   YOUTUBE PREVIEWS                            ║
   ╚════════════════════════════════════════════════════════════════╝ */

const YouTubePreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const urls = parseUrls(imageUrl);
  return (
    <BrowserFrame brandColor="#FF0000">
      <div className="bg-[#0f0f0f]">
        <div className="relative" style={{ aspectRatio: "16/9" }}>
          {urls.length > 0 ? <RenderMedia src={urls[0]} className="w-full h-full object-cover" isVideoHint={isLikelyVideo(urls[0])} /> : <div className="w-full h-full bg-zinc-800" />}
          {urls.length > 0 && isLikelyVideo(urls[0]) && <PlayOverlay playing={playing} onToggle={() => setPlaying(!playing)} accent="bg-red-600/80" />}
        </div>
        <div className="p-3 flex gap-3"><CompanyAvatar className="h-9 w-9 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold leading-tight line-clamp-2">{caption || "Video Title"}</p><p className="text-zinc-400 text-xs mt-1">REDtech Africa · Just now</p></div></div>
      </div>
    </BrowserFrame>
  );
};

const YouTubeShortsPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const urls = parseUrls(imageUrl);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        {urls.length > 0 ? <RenderMedia src={urls[0]} className="w-full h-full object-cover" isVideoHint={isLikelyVideo(urls[0])} /> : <div className="w-full h-full bg-zinc-900" />}
        {urls.length > 0 && isLikelyVideo(urls[0]) && <PlayOverlay playing={playing} onToggle={() => setPlaying(!playing)} accent="bg-red-600/70" />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)" }} />
        <div className="absolute top-8 left-3 z-10 pointer-events-none flex items-center gap-1.5"><Youtube className="h-4 w-4 text-white fill-white" /><span className="text-white font-bold text-xs">Shorts</span></div>
        <div className="absolute bottom-5 left-3 right-14 z-10 pointer-events-none"><div className="flex items-center gap-2 mb-1.5"><CompanyAvatar className="h-8 w-8" /><span className="text-white text-xs font-bold">{handle("youtube")}</span></div><p className="text-white text-[10px] leading-relaxed line-clamp-3">{caption}</p></div>
      </div>
    </PhoneFrame>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                    TIKTOK PREVIEW                             ║
   ╚════════════════════════════════════════════════════════════════╝ */

const TikTokPreview = ({ caption, imageUrl }: PostPreviewProps) => {
  const [playing, setPlaying] = useState(false);
  const urls = parseUrls(imageUrl);
  return (
    <PhoneFrame bg="#000">
      <div className="absolute inset-0">
        {urls.length > 0 ? <RenderMedia src={urls[0]} className="w-full h-full object-cover" isVideoHint={isLikelyVideo(urls[0])} /> : <div className="w-full h-full bg-zinc-900" />}
        {urls.length > 0 && isLikelyVideo(urls[0]) && <PlayOverlay playing={playing} onToggle={() => setPlaying(!playing)} />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)" }} />
        {/* TikTok side action bar */}
        <div className="absolute right-2 bottom-24 flex flex-col gap-4 items-center z-10 pointer-events-none">
          <CompanyAvatar className="h-10 w-10 border-2 border-white" />
          {[{ icon: Heart, n: "145k" }, { icon: MessageCircle, n: "2.3k" }, { icon: Bookmark, n: "18k" }, { icon: Share2, n: "Share" }].map(({ icon: Icon, n }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5"><Icon className="h-6 w-6 text-white fill-white" /><span className="text-[9px] text-white font-medium">{n}</span></div>
          ))}
        </div>
        <div className="absolute bottom-5 left-3 right-14 text-white z-10 pointer-events-none">
          <p className="font-bold text-sm mb-0.5">{handle("tiktok")}</p>
          <p className="text-white/90 text-[10px] line-clamp-2 leading-relaxed">{caption}</p>
          <div className="mt-2 flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-white/20" /><p className="text-[9px] text-white/60 truncate">♫ Original sound — REDtech Africa</p></div>
        </div>
      </div>
    </PhoneFrame>
  );
};

/* ╔════════════════════════════════════════════════════════════════╗
   ║                    MAIN DISPATCHER                            ║
   ╚════════════════════════════════════════════════════════════════╝ */

export const PostPreview = (props: PostPreviewProps) => {
  const { platform, postType } = props;
  switch (platform) {
    case "instagram":
      if (postType === "reel") return <IGReelPreview {...props} />;
      if (postType === "story") return <IGStoryPreview {...props} />;
      return <IGPostPreview {...props} />;
    case "linkedin":
      if (postType === "carousel") return <LinkedInCarouselPreview {...props} />;
      return <LinkedInPostPreview {...props} />;
    case "x": case "twitter": return <XPostPreview {...props} />;
    case "facebook": return <FacebookPostPreview {...props} />;
    case "youtube":
      if (postType === "short") return <YouTubeShortsPreview {...props} />;
      return <YouTubePreview {...props} />;
    case "tiktok": return <TikTokPreview {...props} />;
    default: return <LinkedInPostPreview {...props} />;
  }
};
