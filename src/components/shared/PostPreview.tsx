/**
 * PostPreview — renders a pixel-perfect mockup of how a post looks
 * on each social media platform and format type.
 */
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Repeat2, Eye, Share2, Play } from "lucide-react";

interface PostPreviewProps {
  platform: string;
  postType: string;
  caption: string;
  imageUrl?: string | null;
  authorName: string;
  authorAvatar?: string | null;
  scheduledDate?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  linkedin:  "#0077B5",
  twitter:   "#1DA1F2",
  facebook:  "#1877F2",
  youtube:   "#FF0000",
  tiktok:    "#000000",
};

const platformHandle = (platform: string, name: string) => {
  const map: Record<string, string> = { instagram: `@${name.toLowerCase().replace(" ", ".")}`, linkedin: name, twitter: `@${name.toLowerCase().replace(" ", "_")}`, facebook: name, youtube: name, tiktok: `@${name.toLowerCase().replace(" ", "")}` };
  return map[platform] || name;
};

// ─── Instagram Reel Preview ──────────────────────────────────────
const InstagramReelPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="relative mx-auto bg-black rounded-[28px] overflow-hidden shadow-2xl" style={{ width: 220, height: 390 }}>
    {/* Background */}
    {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/> : (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex items-center justify-center">
        <Play className="h-12 w-12 text-white/60"/>
      </div>
    )}
    {/* Overlay gradient */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30"/>
    {/* Top bar */}
    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
      <span className="text-white text-xs font-bold tracking-wide">Reels</span>
      <div className="flex gap-2">
        <div className="h-1 w-8 bg-white/60 rounded-full"/>
        <div className="h-1 w-8 bg-white rounded-full"/>
        <div className="h-1 w-8 bg-white/60 rounded-full"/>
      </div>
    </div>
    {/* Right side actions */}
    <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
      {[{ icon: Heart, label: "14.2k" }, { icon: MessageCircle, label: "94" }, { icon: Send, label: "203" }, { icon: Bookmark, label: "" }].map(({ icon: Icon, label }, i) => (
        <div key={i} className="flex flex-col items-center">
          <Icon className="h-5 w-5 text-white fill-white/20"/>
          {label && <span className="text-white text-[9px] mt-0.5">{label}</span>}
        </div>
      ))}
      <div className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">{authorName?.charAt(0)}</span>
      </div>
    </div>
    {/* Bottom */}
    <div className="absolute bottom-3 left-3 right-10">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center text-white text-[8px] font-bold">{authorName?.charAt(0)}</div>
        <span className="text-white text-[10px] font-semibold">{platformHandle("instagram", authorName)}</span>
        <span className="text-white/60 text-[9px]">· Follow</span>
      </div>
      <p className="text-white text-[9px] leading-tight line-clamp-3">{caption || "Your caption will appear here..."}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <div className="h-3 w-3 rounded-sm bg-[#E1306C]"/>
        <span className="text-white/70 text-[8px]">Original Audio</span>
      </div>
    </div>
  </div>
);

// ─── Instagram Story Preview ──────────────────────────────────────
const InstagramStoryPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="relative mx-auto bg-black rounded-[28px] overflow-hidden shadow-2xl" style={{ width: 220, height: 390 }}>
    {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover"/> : (
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600"/>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"/>
    {/* Progress bars */}
    <div className="absolute top-3 left-3 right-3 flex gap-1">
      {[1,2,3].map(i => <div key={i} className={`h-0.5 flex-1 rounded-full ${i === 2 ? "bg-white" : "bg-white/40"}`}/>)}
    </div>
    {/* Author */}
    <div className="absolute top-7 left-3 flex items-center gap-2">
      <div className="h-7 w-7 rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">{authorName?.charAt(0)}</span>
      </div>
      <div>
        <p className="text-white text-[9px] font-semibold">{platformHandle("instagram", authorName)}</p>
        <p className="text-white/60 text-[8px]">Now</p>
      </div>
    </div>
    {/* Caption */}
    <div className="absolute bottom-6 left-0 right-0 px-4">
      <p className="text-white text-[9px] text-center leading-tight">{caption || "Your story caption..."}</p>
      <div className="mt-3 border border-white/50 rounded-full px-3 py-1 flex items-center gap-1">
        <span className="text-white/80 text-[8px] flex-1">Send message...</span>
        <Send className="h-3 w-3 text-white/60"/>
      </div>
    </div>
  </div>
);

// ─── Instagram Square/Portrait Post ──────────────────────────────
const InstagramPostPreview = ({ caption, imageUrl, authorName, postType }: PostPreviewProps) => {
  const isPortrait = postType === "portrait";
  const imgH = isPortrait ? 270 : 220;
  return (
    <div className="mx-auto bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-border/20" style={{ width: 280 }}>
      <div className="flex items-center gap-2 p-2.5">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-400 p-0.5">
          <div className="h-full w-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
            <span className="text-[8px] font-bold" style={{ color: "#E1306C" }}>{authorName?.charAt(0)}</span>
          </div>
        </div>
        <p className="text-xs font-semibold flex-1">{platformHandle("instagram", authorName)}</p>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground"/>
      </div>
      <div className="overflow-hidden" style={{ height: imgH }}>
        {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/> : (
          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-orange-100 dark:from-pink-950 dark:to-orange-950 flex items-center justify-center">
            <span className="text-3xl opacity-30">📷</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3">
            <Heart className="h-5 w-5"/> <MessageCircle className="h-5 w-5"/> <Send className="h-5 w-5"/>
          </div>
          <Bookmark className="h-5 w-5"/>
        </div>
        <p className="text-xs font-semibold mb-0.5">14,200 likes</p>
        <p className="text-xs"><span className="font-semibold">{platformHandle("instagram", authorName)}</span> <span className="text-muted-foreground">{caption?.slice(0, 80) || "Your caption..."}{caption?.length > 80 ? "... more" : ""}</span></p>
      </div>
    </div>
  );
};

// ─── LinkedIn Post Preview ────────────────────────────────────────
const LinkedInPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-border/20" style={{ width: 300 }}>
    <div className="p-3">
      <div className="flex gap-2 mb-2">
        <div className="h-9 w-9 rounded-full bg-[#0077B5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {authorName?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-semibold">{authorName}</p>
          <p className="text-[9px] text-muted-foreground">Social Media Manager · REDtech Africa</p>
          <p className="text-[9px] text-muted-foreground">Just now · 🌐</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0"/>
      </div>
      <p className="text-xs leading-relaxed mb-2 whitespace-pre-wrap">{caption?.slice(0, 200) || "Your post content will appear here..."}{caption?.length > 200 ? "\n\n...see more" : ""}</p>
    </div>
    {imageUrl && (
      <div className="overflow-hidden" style={{ height: 160 }}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover"/>
      </div>
    )}
    <div className="px-3 pt-2 pb-1 text-[9px] text-muted-foreground flex justify-between border-b border-border/40">
      <span>👍❤️💡 523 reactions</span><span>61 comments · 88 reposts</span>
    </div>
    <div className="px-2 py-1.5 flex justify-around">
      {[{ icon: ThumbsUp, label: "Like" }, { icon: MessageCircle, label: "Comment" }, { icon: Repeat2, label: "Repost" }, { icon: Send, label: "Send" }].map(({ icon: Icon, label }) => (
        <button key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-[#0077B5] px-2 py-1 rounded transition-colors">
          <Icon className="h-3 w-3"/>{label}
        </button>
      ))}
    </div>
  </div>
);

// ─── LinkedIn Carousel Preview ────────────────────────────────────
const LinkedInCarouselPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-border/20" style={{ width: 300 }}>
    <div className="p-3 flex gap-2 items-center">
      <div className="h-8 w-8 rounded-full bg-[#0077B5] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{authorName?.charAt(0)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{authorName}</p>
        <p className="text-[9px] text-muted-foreground">Just now</p>
      </div>
    </div>
    <p className="px-3 text-xs text-muted-foreground mb-2">{caption?.slice(0, 100) || "Carousel caption..."}</p>
    <div className="relative bg-gradient-to-br from-[#0077B5]/10 to-blue-100 dark:to-blue-950 h-44 flex items-center justify-center">
      {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover absolute inset-0"/> : null}
      <div className="relative z-10 text-center">
        <p className="text-4xl font-black text-[#0077B5]">01</p>
        <p className="text-sm font-semibold text-foreground mt-1">Slide 1 of 5</p>
        <p className="text-xs text-muted-foreground">Swipe to read more →</p>
      </div>
      {/* Navigation dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 rounded-full transition-all ${i===1 ? "w-4 bg-[#0077B5]" : "w-1.5 bg-[#0077B5]/30"}`}/>)}
      </div>
    </div>
    <div className="px-2 py-2 flex justify-around border-t border-border/40">
      {[{ icon: ThumbsUp, label: "Like" }, { icon: MessageCircle, label: "Comment" }, { icon: Repeat2, label: "Repost" }, { icon: Send, label: "Send" }].map(({ icon: Icon, label }) => (
        <button key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground px-2 py-1 rounded">
          <Icon className="h-3 w-3"/>{label}
        </button>
      ))}
    </div>
  </div>
);

// ─── YouTube Video Preview ────────────────────────────────────────
const YouTubeVideoPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto" style={{ width: 300 }}>
    <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl" style={{ height: 168 }}>
      {imageUrl ? <img src={imageUrl} alt="" className="w-full h-full object-cover"/> : (
        <div className="w-full h-full bg-gradient-to-br from-red-900 to-black flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-[#FF0000] flex items-center justify-center shadow-xl">
            <Play className="h-7 w-7 text-white fill-white ml-1"/>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded">2:47</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-black/50 flex items-center justify-center">
          <Play className="h-7 w-7 text-white fill-white ml-1"/>
        </div>
      </div>
    </div>
    <div className="mt-2 flex gap-2">
      <div className="h-8 w-8 rounded-full bg-[#FF0000] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{authorName?.charAt(0)}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{caption?.slice(0, 80) || "Video title appears here"}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{authorName} · 0 views · Just now</p>
      </div>
    </div>
  </div>
);

// ─── Twitter / X Post Preview ─────────────────────────────────────
const TwitterPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800" style={{ width: 290 }}>
    <div className="p-3 flex gap-2">
      <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{authorName?.charAt(0)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-white text-xs font-bold">{authorName}</span>
          <svg className="h-3 w-3 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1.01-2.52-1.27-3.91-.81C14.67 2.88 13.43 2 12 2s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81-1.01 1.01-1.27 2.52-.81 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91 1.01 1.01 2.52 1.27 3.91.81C9.33 21.12 10.57 22 12 22s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81 1.01-1.01 1.27-2.52.81-3.91C21.12 14.67 22 13.43 22 12z"/></svg>
          <span className="text-zinc-500 text-[9px]">@{authorName?.toLowerCase().replace(" ", "_")}</span>
        </div>
        <p className="text-white text-xs leading-relaxed mt-1">{caption?.slice(0, 280) || "Your tweet appears here..."}</p>
        {imageUrl && <img src={imageUrl} alt="" className="w-full rounded-xl mt-2 border border-zinc-700"/>}
        <div className="flex justify-between mt-3 text-zinc-500">
          {[{ icon: MessageCircle, label: "24" }, { icon: Repeat2, label: "97" }, { icon: Heart, label: "412" }, { icon: Eye, label: "9.1k" }, { icon: Share2, label: "" }].map(({ icon: Icon, label }, i) => (
            <button key={i} className="flex items-center gap-1 hover:text-[#1DA1F2] transition-colors">
              <Icon className="h-3.5 w-3.5"/>
              {label && <span className="text-[9px]">{label}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Facebook Post Preview ────────────────────────────────────────
const FacebookPostPreview = ({ caption, imageUrl, authorName }: PostPreviewProps) => (
  <div className="mx-auto bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-border/20" style={{ width: 300 }}>
    <div className="p-3 flex gap-2">
      <div className="h-9 w-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{authorName?.charAt(0)}</div>
      <div>
        <p className="text-xs font-bold">{authorName}</p>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">Just now ·</span>
          <svg className="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
        </div>
      </div>
      <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto"/>
    </div>
    <p className="px-3 pb-2 text-xs">{caption?.slice(0, 150) || "Your Facebook post content..."}</p>
    {imageUrl && <img src={imageUrl} alt="" className="w-full" style={{ maxHeight: 160, objectFit: "cover" }}/>}
    <div className="px-3 py-1.5 text-[9px] text-muted-foreground flex justify-between border-b border-border/40">
      <span>👍❤️😂 178 reactions</span><span>23 comments · 41 shares</span>
    </div>
    <div className="px-2 py-1.5 flex justify-around">
      {[{ icon: ThumbsUp, label: "Like" }, { icon: MessageCircle, label: "Comment" }, { icon: Share2, label: "Share" }].map(({ icon: Icon, label }) => (
        <button key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-[#1877F2] px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
          <Icon className="h-3.5 w-3.5"/>{label}
        </button>
      ))}
    </div>
  </div>
);

// ─── Main Export ──────────────────────────────────────────────────
export const PostPreview = (props: PostPreviewProps) => {
  const { platform, postType } = props;

  if (platform === "instagram") {
    if (postType === "reel") return <InstagramReelPreview {...props}/>;
    if (postType === "story") return <InstagramStoryPreview {...props}/>;
    return <InstagramPostPreview {...props}/>;
  }
  if (platform === "linkedin") {
    if (postType === "carousel") return <LinkedInCarouselPreview {...props}/>;
    return <LinkedInPostPreview {...props}/>;
  }
  if (platform === "youtube") return <YouTubeVideoPreview {...props}/>;
  if (platform === "twitter") return <TwitterPostPreview {...props}/>;
  if (platform === "facebook") return <FacebookPostPreview {...props}/>;

  // Default fallback
  return <LinkedInPostPreview {...props}/>;
};
