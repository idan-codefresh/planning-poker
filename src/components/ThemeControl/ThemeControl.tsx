import { useEffect, useState } from 'react';
import { MenuItem } from '../Toolbar/MenuItem';

export const ThemeControl = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <MenuItem
      icon={theme === 'dark' ? '☀️' : '🌙'}
      label={theme === 'dark' ? 'Light' : 'Dark'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      key={1}
      testId='toolbar.menu.theme'
    />
  );
};
