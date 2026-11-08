import { Status } from "@/backend";
import {
  EntryVideoOverlay,
  shouldSkipEntryVideo,
} from "@/components/EntryVideoOverlay";
import { Header, type NavKey } from "@/components/Header";
import { Layout } from "@/components/Layout";
import { SignupForm } from "@/components/SignupForm";
import { StatusScreen } from "@/components/StatusScreen";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useMyProfile } from "@/hooks/useProfile";
import { applyBrandingTheme } from "@/lib/theme";
import { AboutPage } from "@/pages/AboutPage";
import { AdminPage } from "@/pages/AdminPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { LoginPage } from "@/pages/LoginPage";
import { RedeemInvitePage } from "@/pages/RedeemInvitePage";
import { useEffect, useState } from "react";

/**
 * The single-use invite token carried by an invite link. The link opens the app
 * with `?invite=<linkToken>` (or `#invite=<linkToken>`); the token is read once
 * on mount so it survives the Internet Identity sign-in round trip.
 */
function readInviteToken(): string | null {
  if (typeof window === "undefined" || !window.location) return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("invite");
    if (fromQuery) return fromQuery;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash) {
      const fromHash = new URLSearchParams(hash).get("invite");
      if (fromHash) return fromHash;
    }
  } catch {
    // A malformed URL must not stop the app from rendering.
  }
  return null;
}

export default function App() {
  const { isAuthenticated, isInitializing, signOut } = useAuth();
  const [nav, setNav] = useState<NavKey>("directory");
  const [publicView, setPublicView] = useState<"login" | "about">("login");
  const [editingProfile, setEditingProfile] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(() =>
    readInviteToken(),
  );
  // The entry video plays at most once per browser session; reduced-motion
  // users and repeat visits within the session skip it entirely.
  const [entryVideoDone, setEntryVideoDone] = useState(() =>
    shouldSkipEntryVideo(),
  );

  useEffect(() => {
    applyBrandingTheme();
  }, []);

  const profile = useMyProfile(isAuthenticated);
  const me = profile.data ?? null;
  const isApproved = me?.status === Status.approved;
  const isAdmin = useIsAdmin();

  const handleSignOut = () => {
    setNav("directory");
    setEditingProfile(false);
    signOut();
  };

  if (isInitializing) {
    return (
      <Layout header={null}>
        <div
          data-ocid="app.loading_state"
          className="flex min-h-[60vh] items-center justify-center"
          aria-busy="true"
        >
          <p className="text-sm text-muted-foreground">
            Loading secure session…
          </p>
        </div>
      </Layout>
    );
  }

  // An invite link leads to Internet Identity sign-in and then to the 6-digit
  // code entry screen, regardless of any existing profile.
  if (inviteToken) {
    if (!isAuthenticated) {
      return (
        <Layout header={null}>
          <LoginPage onOpenAbout={() => setPublicView("about")} />
        </Layout>
      );
    }
    return (
      <Layout header={null}>
        <RedeemInvitePage
          linkToken={inviteToken}
          onRedeemed={() => setInviteToken(null)}
        />
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout header={null}>
        {publicView === "about" ? (
          <AboutPage onBackToLogin={() => setPublicView("login")} />
        ) : (
          <LoginPage onOpenAbout={() => setPublicView("about")} />
        )}
      </Layout>
    );
  }

  if (profile.isLoading) {
    return (
      <Layout header={null}>
        <div
          data-ocid="app.profile_loading_state"
          className="flex min-h-[60vh] items-center justify-center"
          aria-busy="true"
        >
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </Layout>
    );
  }

  if (profile.isError) {
    return (
      <Layout header={null}>
        <div
          data-ocid="app.error_state"
          role="alert"
          className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
        >
          <p className="font-display text-lg font-semibold text-foreground">
            We could not load your profile
          </p>
          <p className="text-sm text-muted-foreground">
            Please refresh the page. If the problem continues, sign out and sign
            in again.
          </p>
        </div>
      </Layout>
    );
  }

  // A signed-in caller with no profile, or one who is not approved, sees only
  // the invitation message. There is no public sign-up path.
  if (!me || !isApproved) {
    return (
      <Layout
        header={
          <Header
            active={nav}
            onNavigate={setNav}
            isAuthenticated={isAuthenticated}
            displayName={me?.fullName}
            hideNav
            onSignOut={handleSignOut}
          />
        }
      >
        <StatusScreen />
      </Layout>
    );
  }

  if (editingProfile) {
    return (
      <Layout
        header={
          <Header
            active={nav}
            onNavigate={setNav}
            isAuthenticated={isAuthenticated}
            displayName={me.fullName}
            showAdmin={isAdmin}
            onSignOut={handleSignOut}
          />
        }
      >
        <SignupForm
          profile={me}
          onDone={() => setEditingProfile(false)}
          onCancel={() => setEditingProfile(false)}
        />
      </Layout>
    );
  }

  const view = nav === "admin" && !isAdmin ? "directory" : nav;

  return (
    <>
      <Layout
        header={
          <Header
            active={view}
            onNavigate={setNav}
            isAuthenticated={isAuthenticated}
            displayName={me.fullName}
            showAdmin={isAdmin}
            onSignOut={handleSignOut}
          />
        }
      >
        {view === "about" ? (
          <AboutPage />
        ) : view === "admin" ? (
          <AdminPage profile={me} />
        ) : (
          <DirectoryPage
            me={me}
            onEditProfile={() => setEditingProfile(true)}
          />
        )}
      </Layout>
      {!entryVideoDone ? (
        <EntryVideoOverlay onDone={() => setEntryVideoDone(true)} />
      ) : null}
    </>
  );
}
