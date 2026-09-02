import { useState, useEffect } from "react";
import { Post as PostType } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import { importPublicKey, encryptMessage } from "@/lib/crypto";


interface PostProps {
  post: PostType;
  onFlag: (id: string) => void;
}




  const encryptMessageLocally = async (text: string, recipientId: string): Promise<string> => {
        try {
        if (!supabase) return "ENCRYPTED_MOCK";
        const { data, error } = await supabase.from('profiles').select('public_key').eq('anon_id', recipientId).single();
        if (error || !data || !data.public_key) {
            throw new Error("Public key not found for recipient.");
        }
        const pubKey = await importPublicKey(data.public_key);
        return await encryptMessage(text, pubKey);
        } catch (e) {
        console.error("Encryption failed", e);
        return "ENCRYPTED_MOCK";
        }
    };

export default function Post({ post, onFlag }: PostProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [comments, setComments] = useState<Array<Record<string, unknown>>>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
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

            // Check like state
            const { data: likeData } = await supabase.from('likes')
              .select('*')
              .eq('user_id', profile.anon_id)
              .eq('post_id', post.id);
            if (likeData && likeData.length > 0) setIsLiked(true);

            // Fetch total likes
            const { count } = await supabase.from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id);
            setLikesCount(count || 0);
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

  const handleLike = async () => {
    if (!anonId) return;
    setIsLoading(true);
    if (supabase) {
      if (isLiked) {
        await supabase.from('likes').delete().eq('user_id', anonId).eq('post_id', post.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase.from('likes').insert([{ user_id: anonId, post_id: post.id }]);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        if (post.authorId !== anonId) {
           await supabase.from('notifications').insert([{
             user_id: post.authorId,
             type: 'LIKE',
             content: `User ${anonId} liked your post "${post.title.substring(0, 20)}..."`
           }]);
        }
      }
    } else {
       setIsLiked(!isLiked);
       setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    }
    setIsLoading(false);
  };

  const handleMessage = async () => {
    const message = prompt(`ENTER ANONYMOUS MESSAGE FOR AUTHOR ${post.authorId}:`);
    if (message) {
      if (supabase && anonId) {
        const encryptedMessage = await encryptMessageLocally(message, post.authorId);
        if (!encryptedMessage || encryptedMessage === "ENCRYPTED_MOCK") {
          alert(`ERROR: SECURE ENCRYPTION FAILED. MESSAGE ABORTED.`);
          return;
        }
        const { error } = await supabase.from('messages').insert([{
           sender_id: anonId,
           receiver_id: post.authorId,
           encrypted_content: encryptedMessage
        }]);
        if (!error) alert(`MESSAGE SECURELY SENT TO AUTHOR ${post.authorId}`);
        else alert(`ERROR SENDING MESSAGE.`);
      } else {
        alert(`MESSAGE SECURELY SENT TO AUTHOR ${post.authorId}`);
      }
    }
  };

  const loadComments = async () => {
     setShowComments(!showComments);
     if (!showComments && supabase) {
        const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
        if (data) setComments(data);
     }
  };

  const submitComment = async () => {
     if (!newComment.trim() || !anonId) return;
     if (supabase) {
        const { data } = await supabase.from('comments').insert([{
           post_id: post.id,
           author_id: anonId,
           content: newComment.trim()
        }]).select();

        if (data) {
           setComments([...comments, data[0]]);
           setNewComment("");

           // Create a notification for the post author
           if (post.authorId !== anonId) {
             await supabase.from('notifications').insert([{
               user_id: post.authorId,
               type: 'COMMENT',
               content: `User ${anonId} commented on your post "${post.title.substring(0, 20)}..."`
             }]);
           }
        }
     } else {
        setComments([...comments, { id: Date.now().toString(), author_id: anonId, content: newComment.trim(), created_at: new Date().toISOString() }]);
        setNewComment("");
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
          onClick={handleLike}
          disabled={isLoading}
          aria-pressed={isLiked}
          className={`text-xs py-1 px-3 border border-black uppercase font-bold transition-colors disabled:opacity-50 ${isLiked ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
        >
          {isLiked ? `UNLIKE (${likesCount})` : `LIKE (${likesCount})`}
        </button>
        <button
          onClick={loadComments}
          disabled={isLoading}
          className="text-xs py-1 px-3 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          COMMENTS ({comments.length > 0 ? comments.length : '...'})
        </button>
        <button
          onClick={handleMessage}
          disabled={isLoading}
          className="text-xs py-1 px-3 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50"
        >
          MESSAGE
        </button>
      </div>

      {showComments && (
        <div className="mb-4 bg-gray-50 border border-black p-4">
           <h3 className="font-bold uppercase tracking-tight text-sm mb-2 border-b border-black pb-1">COMMENTS</h3>
           {comments.length === 0 ? (
              <p className="font-mono text-xs uppercase text-gray-500 mb-4">NO COMMENTS YET.</p>
           ) : (
              <ul className="space-y-3 mb-4">
                 {comments.map(c => (
                    <li key={c.id as string} className="font-mono text-xs border-l-2 border-black pl-2">
                       <span className="font-bold mr-2">{c.author_id as string}:</span>
                       {c.content as string}
                    </li>
                 ))}
              </ul>
           )}
           <div className="flex gap-2">
              <input
                 type="text"
                 value={newComment}
                 onChange={(e) => setNewComment(e.target.value)}
                 placeholder="ADD COMMENT..."
                 className="flex-1 border border-black px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-black uppercase"
              />
              <button
                 onClick={submitComment}
                 disabled={!newComment.trim()}
                 className="text-xs py-1 px-3 bg-black text-white uppercase font-bold disabled:opacity-50"
              >
                 SEND
              </button>
           </div>
        </div>
      )}

      <footer className="flex justify-between items-center border-t border-black pt-4">
        <span className="text-xs uppercase font-mono">
          TYPE: {post.type} | FLAGS: {post.flags}
        </span>
                {post.authorId !== anonId && (
          <button
            onClick={() => {
               setIsFlagged(true);
               onFlag(post.id);
            }}
            disabled={isFlagged}
            aria-label="Flag as fake news"
            className={`text-xs py-2 px-4 border uppercase font-bold transition-colors disabled:opacity-50 ${isFlagged ? 'bg-black text-white border-black' : 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white'}`}
          >
            {isFlagged ? 'FLAGGED' : 'FLAG AS FAKE NEWS'}
          </button>
        )}
      </footer>
    </article>
  );
}
