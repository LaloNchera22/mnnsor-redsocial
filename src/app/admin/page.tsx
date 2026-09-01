"use client";

import { useState, useEffect } from "react";
import { initialPosts, Post as PostType } from "@/lib/mockData";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [posts, setPosts] = useState<PostType[]>([]);

  useEffect(() => {
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
        const savedPosts = localStorage.getItem("platformPosts");
        if (savedPosts) {
          setPosts(JSON.parse(savedPosts));
        } else {
          setPosts(initialPosts);
        }
      }
    };

    fetchPosts();
  }, []);

  const updateStorage = (updatedPosts: PostType[]) => {
    setPosts(updatedPosts);
    if (!supabase) {
      localStorage.setItem("platformPosts", JSON.stringify(updatedPosts));
    }
  };

  const handleApprove = async (id: string) => {
    // Reset flags to 0
    const updatedPosts = posts.map(post => {
      if (post.id === id) {
        return { ...post, flags: 0 };
      }
      return post;
    });
    updateStorage(updatedPosts);

    if (supabase) {
      await supabase.from('posts').update({ flags: 0 }).eq('id', id);
    }
  };

  const handleDelete = async (id: string) => {
    // Remove post entirely
    const updatedPosts = posts.filter(post => post.id !== id);
    updateStorage(updatedPosts);

    if (supabase) {
      await supabase.from('posts').delete().eq('id', id);
    }
  };

  // Algorithm: show posts with > 3 flags
  const flaggedPosts = posts.filter(post => post.flags > 3);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 border-b-2 border-black pb-4 flex justify-between items-end">
        <h1 className="text-3xl font-bold tracking-tighter uppercase text-red-600">Admin Moderation Queue</h1>
        <Link href="/feed" className="text-sm font-bold border border-black px-4 py-2 hover:bg-black hover:text-white uppercase transition-colors">
          Back to Feed
        </Link>
      </header>

      <section>
        {flaggedPosts.length === 0 ? (
          <p className="text-center font-mono uppercase border border-black p-8">QUEUE IS EMPTY. NO FLAGGED CONTENT.</p>
        ) : (
          <div className="space-y-8">
            {flaggedPosts.map(post => (
              <article key={post.id} className="border-2 border-red-600 p-6 bg-red-50">
                <header className="mb-4 border-b border-red-600 pb-2 flex justify-between items-baseline">
                  <h2 className="text-xl font-bold uppercase tracking-tight">{post.title}</h2>
                  <span className="text-sm font-mono uppercase text-red-800">AUTHOR: {post.authorId}</span>
                </header>

                <div className="mb-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                <footer className="flex justify-between items-center border-t border-red-600 pt-4">
                  <span className="text-xs uppercase font-bold text-red-600">
                    CURRENT FLAGS: {post.flags}
                  </span>
                  <div className="space-x-4">
                    <button
                      onClick={() => handleApprove(post.id)}
                      className="text-xs py-2 px-4 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      APPROVE (RESET FLAGS)
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs py-2 px-4 border border-red-600 text-red-600 uppercase font-bold hover:bg-red-600 hover:text-white transition-colors"
                    >
                      DELETE POST
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
