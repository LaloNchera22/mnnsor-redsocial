"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initialPosts, Post as PostType } from "@/lib/mockData";
import Post from "@/components/Post";
import CreatePost from "@/components/CreatePost";
import { supabase } from "@/lib/supabase";

export default function Feed() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    // Check for anonymous user
    const savedUser = localStorage.getItem("anonUser");
    if (!savedUser) {
      router.push("/");
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setUser(JSON.parse(savedUser));

    const fetchPosts = async () => {
      if (supabase) {
        // Fetch from actual Supabase
        const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
        if (data) {
          setPosts(data as PostType[]);
        } else if (error) {
          console.error("Error fetching posts", error);
        }
      } else {
        // Initialize posts from local storage or mock data fallback
        const savedPosts = localStorage.getItem("platformPosts");
        if (savedPosts) {
          setPosts(JSON.parse(savedPosts));
        } else {
          setPosts(initialPosts);
          localStorage.setItem("platformPosts", JSON.stringify(initialPosts));
        }
      }
    };

    fetchPosts();
  }, [router]);

  const handleCreatePost = async (title: string, content: string, type: 'document' | 'audio') => {
    if (!user) return;

    // Create a new post object
    const newPost: PostType = {
      id: `p${Date.now()}`,
      authorId: user.id,
      title,
      content: type === 'audio' ? `[AUDIO FILE: ${content}]` : content,
      type,
      flags: 0,
      createdAt: new Date().toISOString()
    };

    // Update local state immediately for fast feedback
    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);

    if (supabase) {
      // Persist to actual Supabase
      const { error } = await supabase.from('posts').insert([{
        id: newPost.id,
        author_id: newPost.authorId,
        title: newPost.title,
        content: newPost.content,
        type: newPost.type,
        flags: newPost.flags,
        created_at: newPost.createdAt
      }]);
      if (error) {
        console.error("Error creating post", error);
      }
    } else {
      localStorage.setItem("platformPosts", JSON.stringify(updatedPosts));
    }
  };

  const handleBurnIdentity = () => {
    localStorage.removeItem("anonUser");
    router.push("/");
  };

  const handleFlag = async (id: string) => {
    // Update local state immediately for fast feedback
    const updatedPosts = posts.map(post => {
      if (post.id === id) {
        return { ...post, flags: post.flags + 1 };
      }
      return post;
    });
    setPosts(updatedPosts);

    if (supabase) {
      // Find the current flags
      const post = posts.find(p => p.id === id);
      if (post) {
         await supabase.from('posts').update({ flags: post.flags + 1 }).eq('id', id);
      }
    } else {
      localStorage.setItem("platformPosts", JSON.stringify(updatedPosts));
    }
  };

  if (!user) return null;

  // Algorithm: hide posts with > 3 flags
  const visiblePosts = posts.filter(post => post.flags <= 3);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 border-b-2 border-black pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Global Feed</h1>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="text-left md:text-right">
            <div className="text-sm font-bold uppercase">LOGGED IN AS:</div>
            <div className="text-xl font-mono border border-black px-2 py-1 inline-block mt-1">
              {user.id}
            </div>
          </div>
          <button
            onClick={handleBurnIdentity}
            className="py-2 px-4 border border-black text-black font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors"
          >
            BURN IDENTITY
          </button>
        </div>
      </header>

      <section>
        <CreatePost onCreate={handleCreatePost} />

        {visiblePosts.length === 0 ? (
          <p className="text-center font-mono uppercase">NO CONTENT AVAILABLE.</p>
        ) : (
          visiblePosts.map(post => (
            <Post key={post.id} post={post} onFlag={handleFlag} />
          ))
        )}
      </section>
    </main>
  );
}
