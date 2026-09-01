"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Post as PostType } from "@/lib/mockData";

export default function AdminDashboard() {
  const [flaggedPosts, setFlaggedPosts] = useState<PostType[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchFlaggedContent = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase.from('posts').select('*').gt('flags', 0).order('flags', { ascending: false });
      if (data) {
        setFlaggedPosts(data.map(p => ({
          id: p.id,
          authorId: p.author_id,
          title: p.title,
          content: p.content,
          type: p.type as 'document' | 'audio',
          tag: p.tag,
          flags: p.flags,
          createdAt: p.created_at
        })));
      } else if (error) {
        console.error("Error fetching flagged posts:", error);
      }
    }
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }
        const { data: profile, error } = await supabase.from('profiles').select('role, anon_id').eq('id', session.user.id).single();

        if (error || profile?.role !== 'admin') {
          router.push("/feed"); // Not admin, redirect to feed
          return;
        }

        setIsAdmin(true);
        fetchFlaggedContent();
      } else {
        // Mock fallback logic
        const userStr = localStorage.getItem("anonUser");
        if (!userStr) {
           router.push("/");
           return;
        }
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
           router.push("/feed");
           return;
        }
        setIsAdmin(true);
        const stored = localStorage.getItem("mockPosts");
        if (stored) {
          const allPosts = JSON.parse(stored);
          setFlaggedPosts(allPosts.filter((p: PostType) => p.flags > 0).sort((a: PostType, b: PostType) => b.flags - a.flags));
        }
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router, fetchFlaggedContent]);

  const handleAction = async (postId: string, action: 'keep' | 'remove') => {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('anon_id').eq('id', session?.user?.id).single();

      if (action === 'remove') {
        await supabase.from('posts').delete().eq('id', postId);
        await supabase.from('audit_logs').insert([{ admin_id: profile?.anon_id, action: 'removed_post', target_id: postId }]);
      } else {
        await supabase.from('posts').update({ flags: 0 }).eq('id', postId);
        await supabase.from('audit_logs').insert([{ admin_id: profile?.anon_id, action: 'cleared_flags', target_id: postId }]);
      }
      fetchFlaggedContent();
    } else {
      // Mock logic
      const stored = localStorage.getItem("mockPosts");
      if (stored) {
        let allPosts = JSON.parse(stored);
        if (action === 'remove') {
          allPosts = allPosts.filter((p: PostType) => p.id !== postId);
        } else {
          allPosts = allPosts.map((p: PostType) => p.id === postId ? { ...p, flags: 0 } : p);
        }
        localStorage.setItem("mockPosts", JSON.stringify(allPosts));
        setFlaggedPosts(allPosts.filter((p: PostType) => p.flags > 0).sort((a: PostType, b: PostType) => b.flags - a.flags));
      }
    }
  };

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center font-mono uppercase">Loading Admin Dashboard...</div>;
  }

  if (!isAdmin) return null;

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 border-b-4 border-black pb-4">
        <h1 className="text-3xl font-bold tracking-tighter uppercase text-red-600">Admin / Moderation Dashboard</h1>
        <p className="font-mono text-sm uppercase mt-2">SECURE ZONE</p>
      </header>

      <section>
        <h2 className="text-xl font-bold mb-6 uppercase tracking-tight">Flagged Content Queue</h2>

        {flaggedPosts.length === 0 ? (
          <p className="font-mono uppercase p-8 border border-black text-center bg-gray-50">
            NO CONTENT CURRENTLY FLAGGED FOR REVIEW.
          </p>
        ) : (
          <div className="space-y-6">
            {flaggedPosts.map(post => (
              <div key={post.id} className="border-2 border-red-600 p-6 bg-white">
                <div className="flex justify-between items-baseline mb-4 border-b border-gray-300 pb-2">
                  <h3 className="font-bold uppercase tracking-tight">{post.title}</h3>
                  <span className="text-red-600 font-bold font-mono text-sm">FLAGS: {post.flags}</span>
                </div>

                <div className="mb-4 font-mono text-sm text-gray-600">
                  AUTHOR: {post.authorId} | TYPE: {post.type} | ID: {post.id}
                </div>

                <div className="mb-6 font-mono text-sm border p-4 bg-gray-50 max-h-40 overflow-y-auto">
                  {post.content}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleAction(post.id, 'remove')}
                    className="flex-1 py-3 px-4 bg-red-600 text-white font-bold uppercase hover:bg-red-700 transition-colors"
                  >
                    REMOVE CONTENT (BAN)
                  </button>
                  <button
                    onClick={() => handleAction(post.id, 'keep')}
                    className="flex-1 py-3 px-4 border border-black font-bold uppercase hover:bg-black hover:text-white transition-colors"
                  >
                    CLEAR FLAGS (KEEP)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
