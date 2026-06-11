import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/dishyo/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "sonner";

interface RouterContext { queryClient: QueryClient }

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Cette page n'existe pas.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { title: "Dishyo — Partage tes plats" },
      { name: "description", content: "Dishyo : partage tes plats préférés avec tes amis. Les publications disparaissent au bout de 48h." },
      { name: "theme-color", content: "#f5f0e6" },
      { property: "og:title", content: "Dishyo — Partage tes plats" },
      { property: "og:description", content: "Dishyo : partage tes plats préférés avec tes amis. Les publications disparaissent au bout de 48h." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Dishyo — Partage tes plats" },
      { name: "twitter:description", content: "Dishyo : partage tes plats préférés avec tes amis. Les publications disparaissent au bout de 48h." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7c22fd21-3a75-4f56-b262-25278f2e2803/id-preview-c5c22c99--c33a9cbe-39e8-4d13-a7fa-307ca249c9af.lovable.app-1777466759928.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7c22fd21-3a75-4f56-b262-25278f2e2803/id-preview-c5c22c99--c33a9cbe-39e8-4d13-a7fa-307ca249c9af.lovable.app-1777466759928.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },

      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
