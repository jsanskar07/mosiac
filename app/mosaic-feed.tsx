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
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Viewer = {
  displayName: string;
  handle: string;
  identifier: string;
};

type SessionIdentity = {
  type?: string;
  identifier?: string;
};

const defaultViewer: Viewer = {
  displayName: "Mosaic member",
  handle: "@mosaic.member",
  identifier: "Signed in",
};

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

const discoverPosts = [
  ...initialPosts,
  ...initialPosts.map((post) => ({ ...post, id: post.id + initialPosts.length })),
];

const countFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const nav = [
  { label: "Home", icon: Home },
  { label: "Discover", icon: Compass },
  { label: "Messages", icon: MessageCircle, badge: "3" },
  { label: "Activity", icon: Bell, dot: true },
  { label: "Profile", icon: UserRound },
];

function formatCount(value: number) {
  return value > 999 ? countFormatter.format(value) : String(value);
}

function viewerFromIdentities(identities: SessionIdentity[]): Viewer {
  const identity = identities.find((item) => item.type === "email") ?? identities[0];
  const identifier = identity?.identifier?.trim();
  if (!identifier) return defaultViewer;

  const base = identity?.type === "email" ? identifier.split("@")[0] : "mosaic member";
  const words = base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  const displayName = words.join(" ") || "Mosaic member";
  const handleBase = base.toLowerCase().replace(/[^a-z0-9._]+/g, ".");

  return {
    displayName,
    handle: `@${handleBase || "mosaic.member"}`,
    identifier,
  };
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "M";
}

export default function MosaicFeed() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Home");
  const [liked, setLiked] = useState<number[]>([]);
  const [saved, setSaved] = useState<number[]>([]);
  const [following, setFollowing] = useState<string[]>(["Elena Rossi"]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");
  const [viewer, setViewer] = useState<Viewer>(defaultViewer);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadViewer() {
      try {
        let response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          const refresh = await fetch("/api/auth/refresh", {
            method: "POST",
            signal: controller.signal,
          });
          if (refresh.ok) {
            response = await fetch("/api/auth/session", {
              cache: "no-store",
              signal: controller.signal,
            });
          }
        }
        if (response.status === 401) {
          router.replace("/auth");
          return;
        }
        if (!response.ok) return;
        const body = await response.json() as { identities?: SessionIdentity[] };
        setViewer(viewerFromIdentities(body.identities ?? []));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setViewer(defaultViewer);
        }
      }
    }

    void loadViewer();
    return () => controller.abort();
  }, [router]);

  useEffect(() => () => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
  }, []);

  const selectedPost = useMemo(
    () => initialPosts.find((post) => post.id === commentsOpen),
    [commentsOpen],
  );

  function flash(message: string) {
    setToast(message);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2400);
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

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/auth");
      router.refresh();
    }
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
                onClick={() => setActiveNav(item.label)}
                aria-current={activeNav === item.label ? "page" : undefined}
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

        <button className="sidebar-profile" aria-label={`Open ${viewer.displayName}'s profile`} onClick={() => setActiveNav("Profile")}>
          <span className="viewer-avatar" aria-hidden="true">{initials(viewer.displayName)}</span>
          <div>
            <strong>{viewer.displayName}</strong>
            <span>{viewer.handle}</span>
          </div>
          <MoreHorizontal size={19} />
        </button>

        <button className="more-button" onClick={signOut}>
          <LogOut size={20} /> <span>Sign out</span>
        </button>
      </aside>

      <section className="feed-column">
        <header className="mobile-header">
          <button className="wordmark" aria-label="Mosaic home" onClick={() => setActiveNav("Home")}>mosaic<span>.</span></button>
          <div>
            <button className="icon-button" aria-label="Open search" onClick={() => setSearchOpen(true)}><Search size={21} /></button>
            <button className="icon-button mobile-heart" aria-label="View activity" onClick={() => setActiveNav("Activity")}><Heart size={22} /></button>
          </div>
        </header>

        {activeNav === "Home" ? (
          <>
        <div className="feed-topbar">
          <div>
            <p>Your daily Mosaic</p>
            <h1>Welcome back, {viewer.displayName.split(" ")[0]}</h1>
          </div>
          <div className="topbar-actions">
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
                  <img src={story.image} alt="" width="180" height="180" decoding="async" />
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
                      <img src={post.avatar} alt={post.author} width="120" height="120" loading="lazy" decoding="async" />
                    </span>
                    <div>
                      <strong>{post.author}</strong>
                      <span>{post.location} · {post.time}</span>
                    </div>
                  </div>
                  <button className="icon-button" onClick={() => flash("Post options opened")} aria-label={`More options for ${post.author}'s post`}><MoreHorizontal size={21} /></button>
                </header>

                <button className="post-image-button" onDoubleClick={() => !isLiked && setLiked((items) => [...items, post.id])} aria-label={`Like ${post.author}'s post`}>
                  <img
                    className="post-image"
                    src={post.image}
                    alt={`${post.author}'s recent moment`}
                    loading={post.id === 1 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={post.id === 1 ? "high" : "auto"}
                  />
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
          </>
        ) : (
          <SecondaryView
            activeNav={activeNav}
            viewer={viewer}
            onCreate={() => setComposerOpen(true)}
            onNavigate={setActiveNav}
          />
        )}
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
                    <img src={person.image} alt={person.name} width="120" height="120" loading="lazy" decoding="async" />
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
        <button className={activeNav === "Home" ? "active" : ""} aria-label="Home" onClick={() => setActiveNav("Home")}><Home size={23} fill={activeNav === "Home" ? "currentColor" : "none"} /></button>
        <button className={activeNav === "Discover" ? "active" : ""} aria-label="Discover" onClick={() => setActiveNav("Discover")}><Compass size={23} /></button>
        <button className="mobile-create" aria-label="Create post" onClick={() => setComposerOpen(true)}><Plus size={22} /></button>
        <button className={activeNav === "Messages" ? "active" : ""} aria-label="Messages" onClick={() => setActiveNav("Messages")}><MessageCircle size={23} /></button>
        <button className={`mobile-avatar ${activeNav === "Profile" ? "active" : ""}`} aria-label="Profile" onClick={() => setActiveNav("Profile")}><span aria-hidden="true">{initials(viewer.displayName)}</span></button>
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
            <div className="comment-sample"><img src={selectedPost.avatar} alt="" width="120" height="120" loading="lazy" decoding="async" /><p><strong>{selectedPost.handle}</strong> {selectedPost.caption}</p></div>
            <div className="comment-sample"><img src={stories[2].image} alt="" width="180" height="180" loading="lazy" decoding="async" /><p><strong>@theo.frames</strong> The colors in this are everything ✨</p></div>
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

function SecondaryView({
  activeNav,
  viewer,
  onCreate,
  onNavigate,
}: {
  activeNav: string;
  viewer: Viewer;
  onCreate: () => void;
  onNavigate: (view: string) => void;
}) {
  if (activeNav === "Discover") {
    return (
      <section className="workspace-view" aria-labelledby="discover-heading">
        <div className="view-heading"><p>Explore Mosaic</p><h1 id="discover-heading">Discover</h1><span>Fresh ideas, places, and creators picked for you.</span></div>
        <div className="discover-tags"><button>#LifeInColor</button><button>#SlowLiving</button><button>#MadeByHand</button><button>#CityLight</button></div>
        <div className="discover-grid">
          {discoverPosts.map((post) => (
            <button key={post.id} onClick={() => onNavigate("Home")} aria-label={`View ${post.author}'s post in Home`}>
              <img src={post.image} alt={`${post.author}'s discovery post`} loading="lazy" decoding="async" />
              <span><Heart size={15} fill="currentColor" /> {formatCount(post.likes)}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (activeNav === "Messages") {
    return (
      <section className="workspace-view" aria-labelledby="messages-heading">
        <div className="view-heading"><p>Your circle</p><h1 id="messages-heading">Messages</h1><span>Three conversations are waiting for you.</span></div>
        <div className="message-list">
          {suggestions.map((person, index) => (
            <button key={person.name} className="message-row">
              <img src={person.image} alt="" width="120" height="120" loading="lazy" decoding="async" />
              <span><strong>{person.name}</strong><small>{index === 0 ? "Sent you a photo" : index === 1 ? "That color palette is perfect!" : "Coffee this weekend?"}</small></span>
              <time>{index + 2}m</time>
            </button>
          ))}
        </div>
      </section>
    );
  }

  if (activeNav === "Activity") {
    return (
      <section className="workspace-view" aria-labelledby="activity-heading">
        <div className="view-heading"><p>Since yesterday</p><h1 id="activity-heading">Activity</h1><span>New moments from the people in your circle.</span></div>
        <div className="activity-list">
          <div><Heart size={18} /><p><strong>Maya and 12 others</strong> liked your latest post.</p><time>8m</time></div>
          <div><UserRound size={18} /><p><strong>Elena Rossi</strong> started following you.</p><time>1h</time></div>
          <div><MessageCircle size={18} /><p><strong>Theo</strong> commented: “This feels like summer.”</p><time>3h</time></div>
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-view" aria-labelledby="profile-heading">
      <div className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{initials(viewer.displayName)}</span>
        <div><p>Your Mosaic profile</p><h1 id="profile-heading">{viewer.displayName}</h1><span>{viewer.handle}</span></div>
        <button onClick={onCreate}><Plus size={17} /> New post</button>
      </div>
      <div className="profile-stats"><span><strong>0</strong> posts</span><span><strong>0</strong> followers</span><span><strong>0</strong> following</span></div>
      <div className="profile-details"><p>Signed-in identity</p><strong>{viewer.identifier}</strong><span>Your display name currently comes from your verified email address. Profile editing will be added with persistent profiles.</span></div>
      <div className="profile-empty"><ImagePlus size={28} /><strong>Share your first moment</strong><span>Your posts will appear here.</span><button onClick={onCreate}>Create post</button></div>
    </section>
  );
}
