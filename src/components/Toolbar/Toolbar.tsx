import { useTranslation } from 'react-i18next';
import { GamesSVG } from '../SVGs/GamesSVG';

import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { signOut } from '../../repository/firebase';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { LanguageControl } from '../LanguageControl/LanguageControl';
import { GithubSVG } from '../SVGs/Github';
import { MenuSVG } from '../SVGs/Menu';
import { PlusSVG } from '../SVGs/Plus';
import { JoinSVG } from '../SVGs/Join';
import { ThemeControl } from '../ThemeControl/ThemeControl';
import { MenuItem } from './MenuItem';
export const title = 'Octo Planning Poker';

export const Toolbar = () => {
  const history = useHistory();
  const screenSize = useBreakpoint();
  const { t } = useTranslation();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const handleNavigation = (path: string) => {
    history.push(path);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: <PlusSVG />, label: t('toolbar.menu.newSession'), onClick: () => handleNavigation('/'), testId: 'toolbar.menu.newSession' },
    { icon: <JoinSVG />, label: t('toolbar.menu.joinSession'), onClick: () => handleNavigation('/join'), testId: 'toolbar.menu.joinSession' },
    { icon: <GithubSVG />, label: 'GitHub', onClick: () => (window.location.href = 'https://github.com/hellomuthu23/planning-poker') },
  ];

  return (
    <div
      className='flex w-full items-center px-4 h-11 flex-shrink-0'
      style={{ borderBottom: '1px solid var(--lin-border)', background: 'var(--lin-surface)' }}
    >
      {/* Logo */}
      <button
        className='flex items-center gap-2 mr-6 opacity-90 hover:opacity-100 transition-opacity'
        onClick={() => history.push('/')}
      >
        <GamesSVG />
        <span className='text-sm font-semibold tracking-tight' style={{ color: 'var(--lin-text)' }}>
          {title}
        </span>
      </button>

      {/* Nav */}
      <div className='flex items-center flex-1 justify-end gap-1'>
        {screenSize === 'md' || screenSize === 'sm' || screenSize === 'xs' ? (
          <div className='flex relative items-center' ref={dropdownRef}>
            <ThemeControl />
            <LanguageControl />
            <button
              className='p-1.5 rounded-md transition hover:bg-[var(--lin-elevated)] text-[var(--lin-text-2)]'
              onClick={toggleDropdown}
              aria-label='Toggle Menu'
            >
              <MenuSVG />
            </button>
            {isDropdownOpen && (
              <div
                className='absolute right-0 top-10 w-48 rounded-lg z-50 flex flex-col py-1 shadow-lg'
                style={{ background: 'var(--lin-surface)', border: '1px solid var(--lin-border-strong)' }}
              >
                {menuItems.map((item, index) => (
                  <MenuItem icon={item.icon} label={item.label} onClick={item.onClick} key={index} testId={item.testId} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {menuItems.map((item, index) => (
              <NavButton key={index} onClick={item.onClick} testId={item.testId}>
                {item.label}
              </NavButton>
            ))}
            <div className='w-px h-4 mx-1' style={{ background: 'var(--lin-border-strong)' }} />
            <ThemeControl />
            <LanguageControl />
            <div className='w-px h-4 mx-1' style={{ background: 'var(--lin-border-strong)' }} />
            <NavButton onClick={signOut}>Sign out</NavButton>
          </>
        )}
      </div>
    </div>
  );
};

const NavButton: React.FC<{ onClick: () => void; testId?: string; children: React.ReactNode }> = ({ onClick, testId, children }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className='px-3 py-1.5 rounded-md text-xs font-medium transition'
    style={{ color: 'var(--lin-text-2)' }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lin-elevated)', e.currentTarget.style.color = 'var(--lin-text)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = 'var(--lin-text-2)')}
  >
    {children}
  </button>
);
