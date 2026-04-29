"use client";

import { useLayoutEffect } from "react";

function SidebarHider() {
  useLayoutEffect(() => {
    const sidebar = document.querySelector<HTMLElement>('[data-slot="sidebar"]');
    const wrapper = document.querySelector<HTMLElement>('[data-slot="sidebar-wrapper"]');

    sidebar?.setAttribute("data-state", "collapsed");
    sidebar?.setAttribute("data-collapsible", "offcanvas");
    wrapper?.setAttribute("data-state", "collapsed");

    return () => {
      sidebar?.setAttribute("data-state", "expanded");
      sidebar?.setAttribute("data-collapsible", "");
      wrapper?.setAttribute("data-state", "expanded");
    };
  }, []);
  return null;
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarHider />
      {children}
    </>
  );
}
