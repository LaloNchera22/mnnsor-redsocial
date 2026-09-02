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
  const [messages, setMessages] = useState<Array<{ id: string, sender_id: string, content: string, created_at: string }>>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'inbox'>('posts');
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

          const { data: messagesData } = await supabase.from('messages').select('*').eq('receiver_id', profile.anon_id).order('created_at', { ascending: false });
          if (messagesData) {
            const privateJwkStr = localStorage.getItem(`privateKey_${profile.anon_id}`);
            const decryptedMessages = [];
            let privateKey = null;
            if (privateJwkStr) {
               try {
                 privateKey = await window.crypto.subtle.importKey(
                   "jwk",
                   JSON.parse(privateJwkStr),
                   { name: "RSA-OAEP", hash: "SHA-256" },
                   true,
                   ["decrypt"]
                 );
               } catch(e) { console.error("Failed to import private key"); }
            }

            for (const msg of messagesData) {
               let decryptedContent = msg.encrypted_content;
               if (privateKey && msg.encrypted_content.startsWith("ENC:[RSA-OAEP]:")) {
                 try {
                   const base64 = msg.encrypted_content.split(":")[2];
                   const binaryString = atob(base64);
                   const bytes = new Uint8Array(binaryString.length);
                   for (let i = 0; i < binaryString.length; i++) {
                       bytes[i] = binaryString.charCodeAt(i);
                   }
                   const decrypted = await window.crypto.subtle.decrypt(
                     { name: "RSA-OAEP" },
                     privateKey,
                     bytes
                   );
                   const decoder = new TextDecoder();
                   decryptedContent = decoder.decode(decrypted);
                 } catch (e) {
                   console.error("Failed to decrypt message");
                   decryptedContent = "ERROR: UNABLE TO DECRYPT";
                 }
               } else if (msg.encrypted_content.startsWith("ENC:[AES-GCM]:")) {
                  decryptedContent = "LEGACY MESSAGE - DECRYPTION NO LONGER SUPPORTED";
               } else {
                 try { decryptedContent = decodeURIComponent(escape(atob(msg.encrypted_content))); } catch(e) {}
               }
               decryptedMessages.push({
                 id: msg.id,
                 sender_id: msg.sender_id,
                 content: decryptedContent,
                 created_at: msg.created_at
               });
            }
            setMessages(decryptedMessages);
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

  const handleFlag = async (id: string) => {
    try {
      const rlRes = await fetch('/api/rate-limit', { method: 'POST', body: JSON.stringify({ action: 'flag' }) });
      if (!rlRes.ok) {
         alert("RATE LIMIT EXCEEDED FOR FLAGS. PLEASE WAIT.");
         return;
      }
    } catch(e) {
      alert('RATE LIMIT CHECK FAILED');
      return;
    }

    if (supabase) {
       const { error } = await supabase.from('post_flags').insert([{ post_id: id, user_id: anonId }]);
       if (error) {
         if (error.code === '23505') {
            alert("YOU HAVE ALREADY FLAGGED THIS CONTENT.");
         } else {
            alert("Error: " + error.message);
         }
         return;
       }
       const post = posts.find(p => p.id === id);
       if (post) {
         await supabase.from('posts').update({ flags: post.flags + 1 }).eq('id', id);
         setPosts(posts.map(p => p.id === id ? { ...p, flags: p.flags + 1 } : p));
         alert("CONTENT FLAGGED FOR MODERATION.");
       }
    } else {
      const localFlags = JSON.parse(localStorage.getItem("flagged_posts") || "[]");
      if (localFlags.indexOf(id) !== -1) {
        alert("YOU HAVE ALREADY FLAGGED THIS CONTENT.");
        return;
      }
      localFlags.push(id);
      localStorage.setItem("flagged_posts", JSON.stringify(localFlags));

      const stored = localStorage.getItem("mockPosts");
      let allPosts = stored ? JSON.parse(stored) : [];
      allPosts = allPosts.map((p: PostType) => p.id === id ? { ...p, flags: p.flags + 1 } : p);
      localStorage.setItem("mockPosts", JSON.stringify(allPosts));

      const updated = posts.map(p => p.id === id ? { ...p, flags: p.flags + 1 } : p);
      setPosts(updated);
      alert("CONTENT FLAGGED FOR MODERATION.");
    }
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

      <div className="flex border-b-2 border-black mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 font-bold uppercase tracking-tight p-4 ${activeTab === 'posts' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
        >
          Your Publications
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 font-bold uppercase tracking-tight p-4 ${activeTab === 'inbox' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
        >
          Inbox ({messages.length})
        </button>
      </div>

      <section>
        {activeTab === 'posts' && (
          <>
            {posts.length === 0 ? (
              <p className="text-center font-mono uppercase border border-black p-8 bg-gray-50">NO PUBLICATIONS YET.</p>
            ) : (
              posts.map(post => (
                <Post key={post.id} post={post} onFlag={handleFlag} />
              ))
            )}
          </>
        )}

        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center font-mono uppercase border border-black p-8 bg-gray-50">NO MESSAGES IN INBOX.</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="border-2 border-black p-4 bg-white relative">
                  <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2">
                    <span className="font-bold uppercase text-xs">FROM: {msg.sender_id}</span>
                    <span className="font-mono text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-mono text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
