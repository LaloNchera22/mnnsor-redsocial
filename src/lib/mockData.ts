export type PostType = 'document' | 'audio';

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string; // Text for document, URL for audio
  type: PostType;
  tag: string;
  flags: number;
  createdAt: string;
}

export const initialPosts: Post[] = [
  {
    id: "p1",
    authorId: "X8K9M2",
    title: "THE IMPACT OF QUANTUM COMPUTING ON ENCRYPTION",
    content: "This document outlines the theoretical implications of Shor's algorithm on RSA and ECC cryptographic systems over the next decade. Quantum supremacy poses a significant threat to current infrastructure...",
    type: "document",
    tag: "TECHNOLOGY",
    flags: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: "p2",
    authorId: "B4V1N7",
    title: "INTERVIEW WITH DR. ARIS ON NEUROPLASTICITY",
    content: "[AUDIO FILE: audio_001.mp3]",
    type: "audio",
    tag: "SCIENCE",
    flags: 1,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: "p3",
    authorId: "Z9P0L4",
    title: "UNVERIFIED CONSPIRACY ABOUT 5G NETWORKS",
    content: "This post contains numerous debunked claims regarding cellular networks and should ideally be flagged by the community to test the algorithmic moderation...",
    type: "document",
    tag: "CONSPIRACY",
    flags: 4, // This should go to admin panel
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: "p4",
    authorId: "Q1W2E3",
    title: "FREE REPORTING: LOCAL CORRUPTION EXPOSED",
    content: "An investigative piece detailing the misuse of public funds in the recent municipal infrastructure project, complete with verifiable documentation.",
    type: "document",
    tag: "POLITICS",
    flags: 0,
    createdAt: new Date(Date.now() - 259200000).toISOString()
  }
];
