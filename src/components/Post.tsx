import { useState, useEffect } from "react";
import { Post as PostType } from "@/lib/mockData";

interface PostProps {
  post: PostType;
  onFlag: (id: string) => void;
}

export default function Post({ post, onFlag }: PostProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const followedAuthors = JSON.parse(localStorage.getItem("followedAuthors") || "[]");
    if (followedAuthors.includes(post.authorId)) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsFollowing(true);
    }

    const savedPosts = JSON.parse(localStorage.getItem("savedPosts") || "[]");
    if (savedPosts.includes(post.id)) {

      setIsSaved(true);
    }
  }, [post.authorId, post.id]);

  const handleFollow = () => {
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
  };

  const handleSave = () => {
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
  };

  const handleMessage = () => {
    const message = prompt(`ENTER ANONYMOUS MESSAGE FOR AUTHOR ${post.authorId}:`);
    if (message) {
      alert(`MESSAGE SECURELY SENT TO AUTHOR ${post.authorId}`);
    }
  };

  return (
    <article className="border border-black p-6 mb-8 bg-white">
      <header className="mb-4 border-b border-black pb-2 flex flex-col md:flex-row md:justify-between md:items-baseline gap-2">
        <h2 className="text-xl font-bold uppercase tracking-tight">{post.title}</h2>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-sm font-mono uppercase font-bold">AUTHOR: {post.authorId}</span>
          <span className="text-xs font-mono uppercase bg-black text-white px-2 py-1 mt-1 inline-block">TAG: {post.tag}</span>
        </div>
      </header>

      <div className="mb-6 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {post.type === 'audio' ? (
          <div className="p-4 border border-black bg-gray-50 flex items-center justify-center italic">
            {post.content}
          </div>
        ) : (
          post.content
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-t border-black pt-4">
        <button
          onClick={handleFollow}
          className={`text-xs py-1 px-3 border border-black uppercase font-bold transition-colors ${isFollowing ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
        >
          {isFollowing ? 'UNFOLLOW' : 'FOLLOW'}
        </button>
        <button
          onClick={handleSave}
          className={`text-xs py-1 px-3 border border-black uppercase font-bold transition-colors ${isSaved ? 'bg-black text-white' : 'hover:bg-black hover:text-white'}`}
        >
          {isSaved ? 'UNSAVE' : 'SAVE'}
        </button>
        <button
          onClick={handleMessage}
          className="text-xs py-1 px-3 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors"
        >
          MESSAGE
        </button>
      </div>

      <footer className="flex justify-between items-center border-t border-black pt-4">
        <span className="text-xs uppercase">
          TYPE: {post.type} | FLAGS: {post.flags}
        </span>
        <button
          onClick={() => onFlag(post.id)}
          className="text-xs py-2 px-4 border border-black uppercase font-bold hover:bg-black hover:text-white transition-colors text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
        >
          FLAG AS FAKE NEWS
        </button>
      </footer>
    </article>
  );
}
