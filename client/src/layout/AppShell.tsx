import React from 'react';
import TopAppBar from './TopAppBar';
import Footer from '../components/footer';
import './AppShell.css';

interface AppShellProps {
  appBarProps: React.ComponentProps<typeof TopAppBar>;
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ appBarProps, children }) => {
  return (
    <div className="qs-app-shell">
      <TopAppBar {...appBarProps} />
      <main className="qs-app-shell__main">{children}</main>
      <Footer />
    </div>
  );
};

export default AppShell;

