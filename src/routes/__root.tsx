import "../styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-gradient px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-charcoal">404</h1>
        <h2 className="mt-4 text-xl font-medium text-charcoal">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary-gradient px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-95"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app-gradient px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-charcoal">Something didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">You can try again or head back home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary-gradient px-5 py-2.5 text-sm font-medium text-white shadow-soft"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-border bg-white/70 px-5 py-2.5 text-sm font-medium text-charcoal backdrop-blur"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: 'KnowEm — Get to know them before the "I do."' },
      { name: "description", content: "Fun choices. Real insights. Meaningful conversations." },
      { property: "og:title", content: 'KnowEm — Get to know them before the "I do."' },
      {
        property: "og:description",
        content: "Fun choices. Real insights. Meaningful conversations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: 'KnowEm — Get to know them before the "I do."' },
      {
        name: "twitter:description",
        content: "Fun choices. Real insights. Meaningful conversations.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/71650c05-85c1-4f75-84b8-4eba9265403c/id-preview-7430da19--cea7861b-4c0a-445f-a30f-f522bfbfc778.lovable.app-1780743712691.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/71650c05-85c1-4f75-84b8-4eba9265403c/id-preview-7430da19--cea7861b-4c0a-445f-a30f-f522bfbfc778.lovable.app-1780743712691.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <Outlet />
      </main>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
