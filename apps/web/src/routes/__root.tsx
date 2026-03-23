import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useTranslation } from 'react-i18next'
import '#/lib/i18n'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { NotFound } from '../components/NotFound'
import { AuthProvider, useAuth } from '../lib/auth-context'
import {
  createUnknownAuthState,
  resolveRouteAuth,
  type AuthState,
} from '../lib/auth-state'

import appCss from '../styles.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

interface RouterContext {
  queryClient: QueryClient
  auth: AuthState
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    return {
      auth: await resolveRouteAuth(),
    }
  },
  loader: ({ context }) => ({
    auth: context.auth.status === 'unknown'
      ? createUnknownAuthState()
      : context.auth,
  }),
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: '爱增聊',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/logo.svg',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <NotFound />,
})

function InnerApp({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const router = useRouter()

  // Keep router context in sync with auth state
  router.options.context.auth = {
    status: auth.status,
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { queryClient } = Route.useRouteContext()
  const { auth } = Route.useLoaderData()
  const { t, i18n } = useTranslation()

  React.useEffect(() => {
    document.title = t('app.title')
  }, [i18n.language, t])

  return (
    <html lang={i18n.language} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialAuth={auth}>
            <InnerApp>{children}</InnerApp>
          </AuthProvider>
        </QueryClientProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: 'TanStack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
