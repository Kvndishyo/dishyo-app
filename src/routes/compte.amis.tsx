import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserCheck } from "lucide-react";
import { USERS } from "@/lib/mock-data";

export const Route = createFileRoute("/compte/amis")({
  component: FriendsPage,
});

function FriendsPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-3 backdrop-blur-xl">
        <Link to="/compte" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Mes amis</h1>
      </header>

      <div className="p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          Tes amis mutuels apparaissent ici. Suis quelqu'un qui te suit déjà pour devenir amis.
        </p>
        <ul className="space-y-2">
          {USERS.slice(0, 2).map((u) => (
            <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
              <Link to="/profil/$handle" params={{ handle: u.handle }} className="flex flex-1 items-center gap-3">
                <img src={u.avatar} className="h-12 w-12 rounded-full object-cover" />
                <div>
                  <div className="font-semibold">{u.username}</div>
                  <div className="text-xs text-muted-foreground">@{u.handle}</div>
                </div>
              </Link>
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <UserCheck className="h-3 w-3" /> Ami
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
