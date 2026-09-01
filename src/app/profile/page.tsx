"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Post as PostType } from "@/lib/mockData";
import Post from "@/components/Post";

export default function ProfilePage() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [anonId, setAnonId] = useState<string>("UNKNOWN");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfileData = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("anon_id")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setAnonId(profile.anon_id);
          const { data: postsData } = await supabase
            .from("posts")
            .select("*")
            .eq("author_id", profile.anon_id)
            .order("created_at", { ascending: false });

          if (postsData) {
             setPosts(postsData.map(p => ({
               id: p.id,
               authorId: p.author_id,
               title: p.title,
               content: p.content,
               type: p.type as 'document' | 'audio',
               tag: p.tag,
               flags: p.flags,
               createdAt: p.created_at
             })));
          }
        }
      } else {
         const userStr = localStorage.getItem("anonUser");
         if (!userStr) {
            router.push("/");
            return;
         }
         const user = JSON.parse(userStr);
         setAnonId(user.id);

         const storedPosts = localStorage.getItem("mockPosts");
         if (storedPosts) {
            const allPosts: PostType[] = JSON.parse(storedPosts);
            setPosts(allPosts.filter(p => p.authorId === user.id));
         }
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [router]);

  const handleFlag = () => {
     // cannot flag own post visually
  };

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center font-mono uppercase">Loading Profile...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 border-b-4 border-black pb-4 flex items-center gap-6">
        <div className="w-24 h-24 bg-black flex items-center justify-center text-white font-mono text-3xl font-bold uppercase rounded-full">
           {anonId.substring(0,2)}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">ID: {anonId}</h1>
          <p className="font-mono text-sm uppercase mt-2 text-gray-600">Member of the Collective</p>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-tight">Biography</h2>
        <div className="border border-black p-4 font-mono text-sm bg-gray-50">
           No biography provided. Anonymity preserved.
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-6 uppercase tracking-tight border-b-2 border-black pb-2">Your Publications</h2>
        {posts.length === 0 ? (
          <p className="text-center font-mono uppercase border border-black p-8 bg-gray-50">NO PUBLICATIONS YET.</p>
        ) : (
          posts.map(post => (
            <Post key={post.id} post={post} onFlag={handleFlag} />
          ))
        )}
      </section>
    </main>
  );
}
