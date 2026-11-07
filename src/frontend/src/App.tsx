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
import { useEffect, useState } from "react";

export default function App() {
  const { isAuthenticated, isInitializing, signOut } = useAuth();
  const [nav, setNav] = useState<NavKey>("directory");
  const [publicView, setPublicView] = useState<"login" | "about">("login");
  const [editingProfile, setEditingProfile] = useState(false);
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

  if (!me || editingProfile) {
    return (
      <Layout
        header={
          <Header
            active={nav}
            onNavigate={setNav}
            isAuthenticated={isAuthenticated}
            displayName={me?.fullName}
            hideNav={!isApproved}
            showAdmin={isAdmin}
            onSignOut={handleSignOut}
          />
        }
      >
        <SignupForm
          profile={me}
          onDone={() => setEditingProfile(false)}
          onCancel={me ? () => setEditingProfile(false) : undefined}
        />
      </Layout>
    );
  }

  if (!isApproved) {
    const incomplete =
      me.status === Status.pending &&
      (!me.workEmail.trim() || !me.department.trim() || !me.jobTitle.trim());
    return (
      <Layout
        header={
          <Header
            active={nav}
            onNavigate={setNav}
            isAuthenticated={isAuthenticated}
            displayName={me.fullName}
            hideNav
            onSignOut={handleSignOut}
          />
        }
      >
        <StatusScreen
          profile={me}
          onEditDetails={incomplete ? () => setEditingProfile(true) : undefined}
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
