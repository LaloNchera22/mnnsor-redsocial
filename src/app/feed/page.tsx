"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initialPosts, Post as PostType } from "@/lib/mockData";
import Post from "@/components/Post";
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
      <header className="mb-12 border-b-2 border-black pb-4 flex justify-between items-end">
        <h1 className="text-3xl font-bold tracking-tighter uppercase">Global Feed</h1>
        <div className="text-right">
          <div className="text-sm font-bold">LOGGED IN AS:</div>
          <div className="text-xl font-mono border border-black px-2 py-1 inline-block mt-1">
            {user.id}
          </div>
        </div>
      </header>

      <section>
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
