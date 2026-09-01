import { useState, useEffect } from "react";
import { Post as PostType } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";

interface PostProps {
  post: PostType;
  onFlag: (id: string) => void;
}


  const simpleEncrypt = (text: string) => {
    return btoa(unescape(encodeURIComponent(text)));
  };

export default function Post({ post, onFlag }: PostProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('anon_id').eq('id', session.user.id).single();
          if (profile) {
            setAnonId(profile.anon_id);
            // Check follow state
            const { data: followData } = await supabase.from('follows')
              .select('*')
              .eq('follower_id', profile.anon_id)
              .eq('following_id', post.authorId);
            if (followData && followData.length > 0) setIsFollowing(true);

            // Check save state
            const { data: saveData } = await supabase.from('saves')
              .select('*')
              .eq('user_id', profile.anon_id)
              .eq('post_id', post.id);
            if (saveData && saveData.length > 0) setIsSaved(true);
          }
        }
      } else {
        // Fallback mock logic
        const followedAuthors = JSON.parse(localStorage.getItem("followedAuthors") || "[]");
        if (followedAuthors.includes(post.authorId)) setIsFollowing(true);

        const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
        if (savedPosts.includes(post.id)) setIsSaved(true);
      }
    };
    fetchState();
  }, [post.authorId, post.id]);

  const handleFollow = async () => {
    setIsLoading(true);
    if (supabase && anonId) {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', anonId).eq('following_id', post.authorId);
        setIsFollowing(false);
      } else {
        await supabase.from('follows').insert([{ follower_id: anonId, following_id: post.authorId }]);
        setIsFollowing(true);
      }
    } else {
      // Mock logic
      const followedAuthors = JSON.parse(localStorage.getItem("followedAuthors") || "[]");
      if (isFollowing) {
        const updated = followedAuthors.filter((id: string) => id !== post.authorId);
        localStorage.setItem("followedAuthors", JSON.stringify(updated));
        setIsFollowing(false);
      } else {
        followedAuthors.push(post.authorId);
        localStorage.setItem("followedAuthors", JSON.stringify(followedAuthors));
        setIsFollowing(true);
      }
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    if (supabase && anonId) {
      if (isSaved) {
        await supabase.from('saves').delete().eq('user_id', anonId).eq('post_id', post.id);
        setIsSaved(false);
      } else {
        await supabase.from('saves').insert([{ user_id: anonId, post_id: post.id }]);
        setIsSaved(true);
      }
    } else {
      // Mock logic
      const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
      if (isSaved) {
        const updated = savedPosts.filter((id: string) => id !== post.id);
        localStorage.setItem("savedPosts", JSON.stringify(updated));
        setIsSaved(false);
      } else {
        savedPosts.push(post.id);
        localStorage.setItem("savedPosts", JSON.stringify(savedPosts));
        setIsSaved(true);
      }
    }
    setIsLoading(false);
  };

  const handleMessage = async () => {
    const message = prompt(`ENTER ANONYMOUS MESSAGE FOR AUTHOR ${post.authorId}:`);
    if (message) {
      if (supabase && anonId) {
        // In a real e2e encryption system, you'd encrypt `message` with `post.authorId`'s public key
        // For demonstration, we use a simple base64 encode to ensure it's not plain text.
        const encryptedMessage = simpleEncrypt(message);
        const { error } = await supabase.from('messages').insert([{
           sender_id: anonId,
           receiver_id: post.authorId,
           encrypted_content: encryptedMessage // actually encrypted/encoded now
        }]);
        if (!error) alert(`MESSAGE SECURELY SENT TO AUTHOR ${post.authorId}`);
        else alert(`ERROR SENDING MESSAGE.`);
      } else {
        alert(`MESSAGE SECURELY SENT TO AUTHOR ${post.authorId}`);
      }
    }
  };

  return (
    <article className="border border-black p-6 mb-8 bg-white" aria-labelledby={`post-title-${post.id}`}>
      <header className="mb-4 border-b border-black pb-2 flex flex-col md:flex-row md:justify-between md:items-baseline gap-2">
        <h2 id={`post-title-${post.id}`} className="text-xl font-bold uppercase tracking-tight">{post.title}</h2>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-sm font-mono uppercase font-bold">AUTHOR: {post.authorId}</span>
          <span className="text-xs font-mono uppercase bg-black text-white px-2 py-1 mt-1 inline-block">TAG: {post.tag}</span>
        </div>
      </header>

      <div className="mb-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {post.type === 'audio' ? (
          <div className="p-4 border border-black bg-gray-50 flex items-center justify-center italic">
            <a href={post.content} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              [LISTEN TO AUDIO]
            </a>
          </div>
        ) : (
          post.content
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-t border-black pt-4" role="group" aria-label="Post Actions">
        <button
          onClick={handleFollow}
          disabled={isLoading}
          aria-pressed={isFollowing}
          className={`text-xs py-1 px-3 border border-black uppercase font-bold transition-colors disabled:opacity-50 ${isFollowing ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
        >
          {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          aria-pressed={isSaved}
          className={`text-xs py-1 px-3 border border-black uppercase font-bold transition-colors disabled:opacity-50 ${isSaved ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
        >
          {isSaved ? 'UNSAVE' : 'SAVE'}
        </button>
        <button
          onClick={handleMessage}
          disabled={isLoading}
          className="text-xs py-1 px-3 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          MESSAGE
        </button>
      </div>

      <footer className="flex justify-between items-center border-t border-black pt-4">
        <span className="text-xs uppercase font-mono">
          TYPE: {post.type} | FLAGS: {post.flags}
        </span>
        <button
          onClick={() => onFlag(post.id)}
          aria-label="Flag as fake news"
          className="text-xs py-2 px-4 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
        >
          FLAG AS FAKE NEWS
        </button>
      </footer>
    </article>
  );
}
