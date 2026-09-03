"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { importPrivateKey, decryptMessage } from "@/lib/crypto";

interface Message {
  id: string;
  sender_id: string;
  encrypted_content: string;
  read: boolean;
  created_at: string;
  decrypted_content?: string;
  decryption_failed?: boolean;
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMessages = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

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
        const { data: messagesData } = await supabase
          .from("messages")
          .select("*")
          .eq("receiver_id", profile.anon_id)
          .order("created_at", { ascending: false });

        if (messagesData) {
           const privKeyStr = localStorage.getItem("privateKey");
           let privKey: CryptoKey | null = null;

           if (privKeyStr) {
             try {
               privKey = await importPrivateKey(privKeyStr);
             } catch (e) {
               console.error("Failed to import private key", e);
             }
           }

           const processedMessages = await Promise.all(messagesData.map(async (m) => {
             const msg: Message = { ...m };
             if (privKey) {
                try {
                   msg.decrypted_content = await decryptMessage(m.encrypted_content, privKey);
                } catch (e) {
                   msg.decryption_failed = true;
                }
             } else {
                msg.decryption_failed = true;
             }
             return msg;
           }));

           setMessages(processedMessages);
        }
      }
      setLoading(false);
    };

    fetchMessages();
  }, [router]);

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center font-mono uppercase">Loading Inbox...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      <header className="mb-12 border-b-4 border-black pb-4 flex items-center gap-6 justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter uppercase">Inbox</h1>
          <p className="font-mono text-sm uppercase mt-2 text-gray-600">Encrypted Communications</p>
        </div>
        <button onClick={() => router.push('/')} className="text-xs font-bold uppercase underline hover:text-gray-600">
           BACK TO FEED
        </button>
      </header>

      <section>
        {messages.length === 0 ? (
          <p className="text-center font-mono uppercase border border-black p-8 bg-gray-50">NO MESSAGES.</p>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className="border border-black p-4 bg-white">
                <div className="flex justify-between border-b border-black pb-2 mb-2">
                   <span className="font-mono font-bold text-sm uppercase">FROM: {msg.sender_id}</span>
                   <span className="font-mono text-xs uppercase text-gray-500">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <div className="font-mono text-sm whitespace-pre-wrap">
                   {msg.decrypted_content ? msg.decrypted_content : (
                      <span className="text-red-600 italic">
                         {msg.decryption_failed ? "[UNABLE TO DECRYPT MESSAGE. MISSING OR INVALID PRIVATE KEY]" : msg.encrypted_content}
                      </span>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
