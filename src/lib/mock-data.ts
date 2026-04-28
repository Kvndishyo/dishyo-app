export type Category = "Healthy" | "Gourmand" | "Végétarien" | "Exotique" | "Comfort Food";

export const CATEGORIES: { name: Category; emoji: string }[] = [
  { name: "Healthy", emoji: "🥗" },
  { name: "Gourmand", emoji: "🍰" },
  { name: "Végétarien", emoji: "🌿" },
  { name: "Exotique", emoji: "🌍" },
  { name: "Comfort Food", emoji: "🍲" },
];

export const REACTIONS = ["❤️", "😍", "🔥", "🤤", "👏", "🙌"] as const;

export type User = {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  bio?: string;
  followers: number;
  following: number;
  friends: number;
  posts: number;
  isRestaurant?: boolean;
  googleMapsUrl?: string;
};

export type Post = {
  id: string;
  user: User;
  image: string;
  title: string;
  description: string;
  category: Category;
  createdAt: number; // ms
  likes: { emoji: string; count: number }[];
  comments: Comment[];
  isAd?: boolean;
  visibility: "friends" | "public";
};

export type Comment = {
  id: string;
  user: User;
  text: string;
  createdAt: number;
};

export type Notification = {
  id: string;
  type: "follow" | "like" | "comment";
  user: User;
  postPreview?: string;
  createdAt: number;
};

const u = (id: string, username: string, handle: string, avatar: string, extra: Partial<User> = {}): User => ({
  id, username, handle, avatar,
  followers: 0, following: 0, friends: 0, posts: 0,
  ...extra,
});

export const ME: User = u("me", "kevanduval", "kevan",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop",
  { bio: "Foodie passionné 🍽️", followers: 0, following: 3, friends: 0, posts: 3 });

export const USERS: User[] = [
  u("1", "marie_cuisine", "marie", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    { bio: "Recettes de grand-mère ❤️", followers: 1240, following: 320, friends: 45, posts: 87 }),
  u("2", "chef_thomas", "thomas", "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&h=200&fit=crop",
    { bio: "Chef étoilé Lyon", followers: 8900, following: 120, friends: 12, posts: 234, isRestaurant: true,
      googleMapsUrl: "https://maps.google.com/?q=Lyon" }),
  u("3", "sophie_eats", "sophie", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
    { bio: "Healthy & happy 🌿", followers: 432, following: 198, friends: 28, posts: 56 }),
  u("4", "le_petit_bistrot", "petitbistrot", "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop",
    { bio: "Bistrot parisien • 11ème", followers: 2300, following: 50, friends: 8, posts: 145, isRestaurant: true,
      googleMapsUrl: "https://maps.google.com/?q=Paris" }),
  u("5", "julien_food", "julien", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop",
    { bio: "Mange, donc je suis", followers: 89, following: 145, friends: 22, posts: 18 }),
];

const HOUR = 3600 * 1000;
const now = Date.now();

export const POSTS: Post[] = [
  {
    id: "p1", user: USERS[0],
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=800&fit=crop",
    title: "Pizza maison",
    description: "Trop bonne !! 🤤 #miam #faitmaison",
    category: "Gourmand", visibility: "public",
    createdAt: now - 2 * HOUR,
    likes: [{ emoji: "❤️", count: 24 }, { emoji: "🤤", count: 12 }],
    comments: [
      { id: "c1", user: USERS[2], text: "Ça donne envie ! 😍", createdAt: now - HOUR },
    ],
  },
  {
    id: "p2", user: USERS[1],
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=800&fit=crop",
    title: "Bowl healthy",
    description: "Mon déj' du midi 🌿 @sophie_eats #healthy",
    category: "Healthy", visibility: "public",
    createdAt: now - 5 * HOUR,
    likes: [{ emoji: "🔥", count: 89 }, { emoji: "❤️", count: 45 }],
    comments: [],
  },
  {
    id: "p3", user: USERS[3], isAd: true,
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=800&fit=crop",
    title: "Menu du jour",
    description: "Venez découvrir notre nouvelle carte 🍽️ #bistrot #paris",
    category: "Gourmand", visibility: "public",
    createdAt: now - 30 * 60 * 1000,
    likes: [{ emoji: "❤️", count: 156 }],
    comments: [],
  },
  {
    id: "p4", user: USERS[2],
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=800&fit=crop",
    title: "Pancakes du dimanche",
    description: "Dimanche cocooning 🥞✨",
    category: "Comfort Food", visibility: "friends",
    createdAt: now - 18 * HOUR,
    likes: [{ emoji: "😍", count: 33 }],
    comments: [],
  },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "like", user: USERS[0], postPreview: "Pizza maison", createdAt: now - 30 * 60 * 1000 },
  { id: "n2", type: "follow", user: USERS[2], createdAt: now - 2 * HOUR },
  { id: "n3", type: "comment", user: USERS[1], postPreview: "Bowl healthy", createdAt: now - 4 * HOUR },
];

export function timeRemaining(createdAt: number): string {
  const expiresAt = createdAt + 24 * HOUR;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Expiré";
  const h = Math.floor(ms / HOUR);
  const m = Math.floor((ms % HOUR) / (60 * 1000));
  return `${h}h ${m}min`;
}

export function timeAgo(createdAt: number): string {
  const ms = Date.now() - createdAt;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a environ ${h} heure${h > 1 ? "s" : ""}`;
  return `il y a ${Math.floor(h / 24)} j`;
}
