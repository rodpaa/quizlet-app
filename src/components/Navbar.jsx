import { useState } from 'react';
import {
  BookOpen, ChevronDown, Compass, Library, LogIn, LogOut, Menu,
  Moon, Plus, Sparkles, Sun, UserRound, X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ page, onHome, onCreate, onRequestAuth }) {
  const { isDark, toggle } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = page.type === 'home';
  const activeTab = isHome ? page.tab : null;

  const navigate = (action) => {
    action();
    setMobileOpen(false);
  };

  const nav = (
    <>
      <button onClick={() => navigate(() => onHome('discover'))} className={`shell-nav-item ${activeTab === 'discover' ? 'is-active' : ''}`}>
        <Compass size={19} />
        <span>Discover</span>
      </button>
      <button onClick={() => navigate(() => onHome('mine'))} className={`shell-nav-item ${activeTab === 'mine' ? 'is-active' : ''}`}>
        <Library size={19} />
        <span>My library</span>
      </button>
      <button onClick={() => navigate(user ? onCreate : () => onRequestAuth('signup'))} className={`shell-nav-item ${page.type === 'editor' ? 'is-active' : ''}`}>
        <Plus size={19} />
        <span>Create set</span>
      </button>
    </>
  );

  return (
    <>
      <header className="mobile-shell-bar">
        <button onClick={() => onHome('discover')} className="shell-brand" aria-label="Study Library home">
          <span className="shell-brand-mark"><BookOpen size={18} /></span>
          <span>Study Library</span>
        </button>
        <button onClick={() => setMobileOpen((value) => !value)} className="shell-icon-button" aria-label="Toggle navigation" aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      <aside className={`shell-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div>
          <button onClick={() => navigate(() => onHome('discover'))} className="shell-brand" aria-label="Study Library home">
            <span className="shell-brand-mark"><BookOpen size={20} /></span>
            <span>Study Library</span>
          </button>

          <div className="shell-eyebrow"><Sparkles size={13} /> Your study space</div>
          <nav className="shell-nav" aria-label="Main navigation">{nav}</nav>
        </div>

        <div className="shell-account">
          <button onClick={toggle} className="shell-theme-button">
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{isDark ? 'Light appearance' : 'Dark appearance'}</span>
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen((value) => !value)} className="shell-profile" aria-expanded={menuOpen}>
                <span className="shell-avatar">{profile?.displayName?.charAt(0).toUpperCase() || 'S'}</span>
                <span className="shell-profile-copy">
                  <strong>{profile?.displayName || 'Student'}</strong>
                  <small>{user.isDemo ? 'Local demo' : 'Account'}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {menuOpen && (
                <div className="shell-profile-menu">
                  <button onClick={() => { navigate(() => onHome('mine')); setMenuOpen(false); }} className="menu-button"><UserRound size={17} /> My sets</button>
                  <button onClick={() => { signOut(); setMenuOpen(false); navigate(() => onHome()); }} className="menu-button text-qred"><LogOut size={17} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onRequestAuth('signin')} className="shell-sign-in"><LogIn size={17} /> Sign in</button>
          )}
        </div>
      </aside>
      {mobileOpen && <button className="shell-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    </>
  );
}
