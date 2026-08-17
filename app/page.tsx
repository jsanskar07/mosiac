"use client";

/* External editorial images are intentionally rendered at their source URLs in this visual prototype. */
/* eslint-disable @next/next/no-img-element */

import {
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Home,
  ImagePlus,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const stories = [
  { name: "Your story", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=85", own: true },
  { name: "Maya", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=85" },
  { name: "Theo", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=85" },
  { name: "Nora", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=180&q=85" },
  { name: "Jonas", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=180&q=85" },
  { name: "Leila", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=180&q=85" },
];

const suggestions = [
  { name: "Elena Rossi", handle: "@elena.rossi", image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=120&q=85" },
  { name: "Suki Tanaka", handle: "@sukitanaka", image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=85" },
  { name: "Milo Reed", handle: "@miloreed", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=85" },
];

const initialPosts = [
  {
    id: 1,
    author: "Clara Martin",
    handle: "@claraincolor",
    avatar: "https://images.unsplash.com/photo-1529139574466-a303027c1d8e?auto=format&fit=crop&w=120&q=85",
    location: "Le Marais, Paris",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935?auto=format&fit=crop&w=1100&q=90",
    caption: "Slow mornings, loud colors, and nowhere else to be. Paris, you have my heart.",
    likes: 2846,
    comments: 124,
    time: "2h",
    accent: "#fe765f",
  },
  {
    id: 2,
    author: "Léo & Clay",
    handle: "@leoandclay",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=85",
    location: "Atelier 19, Lisbon",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1100&q=90",
    caption: "A little wonky, completely handmade. Today’s kiln opening felt like finding treasure.",
    likes: 1328,
    comments: 47,
    time: "5h",
    accent: "#4b6b53",
  },
];

const nav = [
  { label: "Home", icon: Home },
  { label: "Discover", icon: Compass },
  { label: "Messages", icon: MessageCircle, badge: "3" },
  { label: "Activity", icon: Bell, dot: true },
  { label: "Profile", icon: UserRound },
];

function formatCount(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export default function HomePage() {
  const [activeNav, setActiveNav] = useState("Home");
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [following, setFollowing] = useState<string[]>(["Elena Rossi"]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");

  const selectedPost = useMemo(
    () => initialPosts.find((post) => post.id === commentsOpen),
    [commentsOpen],
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function toggleItem(id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) {
    setter((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setComment("");
    setCommentsOpen(null);
    flash("Comment shared");
  }

  return (
    <main className="site-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <button className="wordmark" onClick={() => setActiveNav("Home")} aria-label="Mosaic home">
          mosaic<span>.</span>
        </button>

        <nav className="nav-list">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={`nav-item ${activeNav === item.label ? "active" : ""}`}
                onClick={() => {
                  setActiveNav(item.label);
                  if (item.label !== "Home") flash(`${item.label} opened`);
                }}
              >
                <span className="nav-icon-wrap">
                  <Icon size={21} strokeWidth={activeNav === item.label ? 2.5 : 1.9} />
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                  {item.dot && <span className="nav-dot" />}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="create-button" onClick={() => setComposerOpen(true)}>
          <Plus size={19} strokeWidth={2.5} />
          <span>Create post</span>
        </button>

        <a className="sidebar-profile" href="/auth" aria-label="Sign in to Mosaic">
          <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=85" alt="Amelia Stone" />
          <div>
            <strong>Sign in to Mosaic</strong>
            <span>Email or mobile</span>
          </div>
          <MoreHorizontal size={19} />
        </a>

        <button className="more-button" onClick={() => flash("More options opened")}>
          <Menu size={20} /> <span>More</span>
        </button>
      </aside>

      <section className="feed-column">
        <header className="mobile-header">
          <button className="wordmark" aria-label="Mosaic home">mosaic<span>.</span></button>
          <div>
            <button className="icon-button" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search size={21} /></button>
            <button className="icon-button mobile-heart" aria-label="View activity" onClick={() => flash("Activity opened")}><Heart size={22} /></button>
          </div>
        </header>

        <div className="feed-topbar">
          <div>
            <p>Sunday, August 16</p>
            <h1>Good morning, Amelia</h1>
          </div>
          <div className="topbar-actions">
            <a className="auth-entry" href="/auth">Sign in</a>
            <button className="round-search" onClick={() => setSearchOpen(true)} aria-label="Search mosaic"><Search size={20} /></button>
          </div>
        </div>

        <section className="stories-section" aria-labelledby="stories-title">
          <div className="section-heading">
            <h2 id="stories-title">Stories</h2>
            <button onClick={() => flash("All stories opened")}>Watch all <ChevronRight size={15} /></button>
          </div>
          <div className="stories-row">
            {stories.map((story) => (
              <button key={story.name} className="story" onClick={() => flash(story.own ? "Add to your story" : `${story.name}’s story opened`)}>
                <span className={`story-ring ${story.own ? "own" : ""}`}>
                  <img src={story.image} alt="" />
                  {story.own && <span className="story-add"><Plus size={12} strokeWidth={3} /></span>}
                </span>
                <span>{story.name}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="feed-divider" />

        <div className="feed-label-row">
          <div>
            <h2>Your feed</h2>
            <span>Fresh moments from your circle</span>
          </div>
          <div className="feed-arrows" aria-hidden="true">
            <button><ChevronLeft size={17} /></button>
            <button><ChevronRight size={17} /></button>
          </div>
        </div>

        <div className="posts-list">
          {initialPosts.map((post) => {
            const isLiked = liked.includes(post.id);
            const isSaved = saved.includes(post.id);
            return (
              <article className="post-card" key={post.id}>
                <header className="post-header">
                  <div className="post-author">
                    <span className="avatar-ring" style={{ "--ring-accent": post.accent } as React.CSSProperties}>
                      <img src={post.avatar} alt={post.author} />
                    </span>
                    <div>
                      <strong>{post.author}</strong>
                      <span>{post.location} · {post.time}</span>
                    </div>
                  </div>
                  <button className="icon-button" onClick={() => flash("Post options opened")} aria-label={`More options for ${post.author}'s post`}><MoreHorizontal size={21} /></button>
                </header>

                <button className="post-image-button" onDoubleClick={() => !isLiked && setLiked((items) => [...items, post.id])} aria-label={`Like ${post.author}'s post`}>
                  <img className="post-image" src={post.image} alt={`${post.author}'s recent moment`} />
                  <span className="photo-index">1 / {post.id === 1 ? 3 : 2}</span>
                </button>

                <div className="post-body">
                  <div className="post-actions">
                    <div>
                      <button className={`action-button ${isLiked ? "liked" : ""}`} onClick={() => toggleItem(post.id, setLiked)} aria-label={isLiked ? "Unlike post" : "Like post"} aria-pressed={isLiked}>
                        <Heart size={23} fill={isLiked ? "currentColor" : "none"} />
                      </button>
                      <button className="action-button" onClick={() => setCommentsOpen(post.id)} aria-label="View comments"><MessageCircle size={22} /></button>
                      <button className="action-button" onClick={() => flash("Share sheet opened")} aria-label="Share post"><Send size={21} /></button>
                    </div>
                    <button className={`action-button ${isSaved ? "saved" : ""}`} onClick={() => toggleItem(post.id, setSaved)} aria-label={isSaved ? "Remove bookmark" : "Bookmark post"} aria-pressed={isSaved}>
                      <Bookmark size={22} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <p className="like-count">{formatCount(post.likes + (isLiked ? 1 : 0))} likes</p>
                  <p className="caption"><strong>{post.handle}</strong> {post.caption}</p>
                  <button className="comments-link" onClick={() => setCommentsOpen(post.id)}>View all {post.comments} comments</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="right-rail">
        <div className="rail-sticky">
          <div className="search-box">
            <Search size={18} />
            <input aria-label="Search people and posts" placeholder="Search mosaic" onFocus={() => setSearchOpen(true)} />
            <kbd>⌘ K</kbd>
          </div>

          <section className="suggestions-card" aria-labelledby="suggestions-title">
            <div className="rail-heading">
              <h2 id="suggestions-title">People you may like</h2>
              <button onClick={() => flash("More suggestions opened")}>See all</button>
            </div>
            <div className="suggestion-list">
              {suggestions.map((person) => {
                const isFollowing = following.includes(person.name);
                return (
                  <div className="suggestion" key={person.name}>
                    <img src={person.image} alt={person.name} />
                    <div>
                      <strong>{person.name}</strong>
                      <span>{person.handle}</span>
                    </div>
                    <button
                      className={isFollowing ? "following" : ""}
                      onClick={() => setFollowing((items) => isFollowing ? items.filter((item) => item !== person.name) : [...items, person.name])}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="week-card">
            <p>WEEKLY SPOTLIGHT</p>
            <h2>#LifeInColor</h2>
            <span>18.4k vibrant moments shared this week.</span>
            <button onClick={() => flash("Spotlight opened")}>
              Explore the collection <ChevronRight size={16} />
            </button>
            <div className="color-orb orb-one" />
            <div className="color-orb orb-two" />
          </section>

          <footer>
            <div><button>About</button><button>Help</button><button>Privacy</button><button>Terms</button></div>
            <p>© 2026 Mosaic</p>
          </footer>
        </div>
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className="active" aria-label="Home"><Home size={23} fill="currentColor" /></button>
        <button aria-label="Discover" onClick={() => flash("Discover opened")}><Compass size={23} /></button>
        <button className="mobile-create" aria-label="Create post" onClick={() => setComposerOpen(true)}><Plus size={22} /></button>
        <button aria-label="Messages" onClick={() => flash("Messages opened")}><MessageCircle size={23} /></button>
        <button className="mobile-avatar" aria-label="Profile"><img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=80&q=85" alt="" /></button>
      </nav>

      {searchOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Search Mosaic">
          <button className="modal-backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search" />
          <div className="search-modal">
            <div className="modal-title"><h2>Search mosaic</h2><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close"><X size={21} /></button></div>
            <label className="modal-search"><Search size={19} /><input placeholder="People, places, or tags" /></label>
            <p>Try searching <button>#LifeInColor</button>, <button>Paris</button>, or <button>ceramics</button>.</p>
          </div>
        </div>
      )}

      {composerOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="create-title">
          <button className="modal-backdrop" onClick={() => setComposerOpen(false)} aria-label="Close composer" />
          <div className="composer-modal">
            <div className="modal-title"><h2 id="create-title">Create a new post</h2><button className="icon-button" onClick={() => setComposerOpen(false)} aria-label="Close"><X size={21} /></button></div>
            <div className="upload-drop"><ImagePlus size={34} /><strong>Share a moment</strong><span>Drop a photo here or choose from your library</span><button onClick={() => flash("Photo picker opened")}>Choose photo</button></div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="comments-title">
          <button className="modal-backdrop" onClick={() => setCommentsOpen(null)} aria-label="Close comments" />
          <div className="comments-modal">
            <div className="modal-title"><h2 id="comments-title">Comments</h2><button className="icon-button" onClick={() => setCommentsOpen(null)} aria-label="Close"><X size={21} /></button></div>
            <div className="comment-sample"><img src={selectedPost.avatar} alt="" /><p><strong>{selectedPost.handle}</strong> {selectedPost.caption}</p></div>
            <div className="comment-sample"><img src={stories[2].image} alt="" /><p><strong>@theo.frames</strong> The colors in this are everything ✨</p></div>
            <form className="comment-form" onSubmit={submitComment}>
              <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a kind comment…" aria-label="Comment" />
              <button type="submit" disabled={!comment.trim()}>Post</button>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
