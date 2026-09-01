"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Post from "@/components/Post";
import CreatePost from "@/components/CreatePost";
import { Post as PostType, initialPosts } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { useInView } from "react-intersection-observer";

export default function Feed() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [anonId, setAnonId] = useState<string>("UNKNOWN");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const { ref, inView } = useInView();

  const fetchPosts = useCallback(async (pageNum: number, search: string = "", reset: boolean = false) => {
    if (supabase) {
      const from = (pageNum - 1) * 10;
      const to = from + 9;
      let query = supabase.from('posts').select('*').lt('flags', 4).order('created_at', { ascending: false }).range(from, to);

      if (search) {
        query = query.textSearch('search_vector', search);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }

      if (data) {
        const formattedPosts: PostType[] = data.map(p => ({
          id: p.id,
          authorId: p.author_id,
          title: p.title,
          content: p.content,
          type: p.type as 'document' | 'audio',
          tag: p.tag,
          flags: p.flags,
          createdAt: p.created_at
        }));
        setPosts(prev => reset ? formattedPosts : [...prev, ...formattedPosts]);
        setHasMore(data.length === 10);
      }
    } else {
      // Mock data logic
      const stored = localStorage.getItem("mockPosts");
      let allPosts = stored ? JSON.parse(stored) : initialPosts;
      if (search) {
        allPosts = allPosts.filter((p: PostType) => (
          p.title.includes(search.toUpperCase()) || p.content.toUpperCase().includes(search.toUpperCase()) || p.tag.toUpperCase().includes(search.toUpperCase())
        ));
      }
      allPosts = allPosts.filter((p: PostType) => p.flags < 4);
      setPosts(allPosts); // No real pagination for mock
      setHasMore(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      let currentAnonId = "UNKNOWN";
      if (supabase) {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) {
           router.push("/");
           return;
         }
         // Fetch profile to get anon_id
         const { data: profile } = await supabase.from('profiles').select('anon_id').eq('id', session.user.id).single();
         if (profile) currentAnonId = profile.anon_id;
      } else {
        const storedUser = localStorage.getItem("anonUser");
        if (!storedUser) {
          router.push("/");
          return;
        }
        currentAnonId = JSON.parse(storedUser).id;
        if (!localStorage.getItem("mockPosts")) {
          localStorage.setItem("mockPosts", JSON.stringify(initialPosts));
        }
      }
      setAnonId(currentAnonId);
      fetchPosts(1, debouncedSearch, true);
    };

    checkAuth();
  }, [router, fetchPosts, debouncedSearch]); // Re-fetch on search change

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const newPost: PostType = {
           id: payload.new.id,
           authorId: payload.new.author_id,
           title: payload.new.title,
           content: payload.new.content,
           type: payload.new.type as 'document' | 'audio',
           tag: payload.new.tag,
           flags: payload.new.flags,
           createdAt: payload.new.created_at
        };
        // Prepend new post
        setPosts(prev => [newPost, ...prev]);
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);


  // Infinite scroll trigger
  useEffect(() => {
    if (inView && hasMore) {
       const timer = setTimeout(() => {
         const nextPage = page + 1;
         setPage(nextPage);
         fetchPosts(nextPage, debouncedSearch, false);
       }, 0);
       return () => clearTimeout(timer);
    }
  }, [inView, hasMore, page, fetchPosts, debouncedSearch]);


  const handleCreatePost = async (title: string, content: string, type: 'document'|'audio', tag: string) => {
    if (supabase) {
      const { error } = await supabase.from('posts').insert([{
        author_id: anonId,
        title: title.toUpperCase(),
        content: content,
        type: type,
        tag: tag.toUpperCase()
      }]);
      if (error) {
        console.error("Error creating post:", error);
      }
    } else {
      const newPost: PostType = {
        id: "p" + Date.now(),
        authorId: anonId,
        title: title.toUpperCase(),
        content,
        type,
        tag: tag.toUpperCase(),
        flags: 0,
        createdAt: new Date().toISOString()
      };
      const updated = [newPost, ...posts];
      setPosts(updated);
      localStorage.setItem("mockPosts", JSON.stringify(updated));
    }
  };


  const handleFlag = async (id: string) => {
    // Check locally if already flagged
    const localFlags = JSON.parse(localStorage.getItem("flagged_posts") || "[]");
    if (localFlags.includes(id)) {
      alert("YOU HAVE ALREADY FLAGGED THIS CONTENT.");
      return;
    }

    if (supabase) {
       // Insert into post_flags to prevent duplicates, rely on RLS/unique constraint
       const { error } = await supabase.from('post_flags').insert([{ post_id: id, user_id: anonId }]);
       if (error) {
         if (error.code === '23505') { // Unique constraint violation
            alert("YOU HAVE ALREADY FLAGGED THIS CONTENT.");
         }
         return;
       }
       const post = posts.find(p => p.id === id);
       if (post) {
         await supabase.from('posts').update({ flags: post.flags + 1 }).eq('id', id);
         setPosts(posts.map(p => p.id === id ? { ...p, flags: p.flags + 1 } : p));

         // Visual confirmation for reporter
         alert("CONTENT FLAGGED FOR MODERATION.");
       }
    } else {
      const updated = posts.map(p => {
        if (p.id === id) return { ...p, flags: p.flags + 1 };
        return p;
      });
      setPosts(updated);
      localStorage.setItem("mockPosts", JSON.stringify(updated));
      alert("CONTENT FLAGGED FOR MODERATION.");
    }

    // Save to local flags array
    localFlags.push(id);
    localStorage.setItem("flagged_posts", JSON.stringify(localFlags));
  };


  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem("anonUser");
    }
    router.push("/");
  };

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-baseline mb-12 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Global Feed</h1>
          <p className="font-mono text-sm uppercase mt-2">ID: {anonId}</p>
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => {
               setSearchQuery(e.target.value);
            }}
            className="border border-black px-2 py-1 font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-black"
          />
          <button onClick={handleLogout} className="text-xs font-bold uppercase underline hover:text-gray-600">
            DISCONNECT
          </button>
        </div>
      </header>

      <section>
        <CreatePost onCreate={handleCreatePost} />

        {posts.length === 0 ? (
          <p className="text-center font-mono uppercase">NO CONTENT AVAILABLE.</p>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onFlag={handleFlag} />
          ))
        )}

        {/* Infinite Scroll trigger element */}
        {hasMore && (
           <div ref={ref} className="h-10 w-full flex items-center justify-center">
             <span className="font-mono text-xs uppercase animate-pulse">LOADING MORE...</span>
           </div>
        )}
      </section>
    </main>
  );
}
