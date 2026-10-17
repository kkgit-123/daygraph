/* Navigation map shared by the sidebar, the top bar breadcrumb and the command palette. */
export const NAV = [
  {
    group: 'Plan',
    items: [
      { to: '/', label: 'Today', icon: 'home', keys: 'G T' },
      { to: '/review', label: 'Review', icon: 'inbox', badge: 'review' },
      { to: '/meetings', label: 'Meetings', icon: 'video' },
    ],
  },
  {
    group: 'Intelligence',
    items: [
      { to: '/ask', label: 'Ask DayGraph', icon: 'sparkles', keys: '/' },
      { to: '/agent', label: 'AI agent', icon: 'bot' },
      { to: '/deep-review', label: 'Deep Review', icon: 'shield', tag: 'Soon' },
      { to: '/search', label: 'Enterprise search', icon: 'search' },
    ],
  },
  {
    group: 'Knowledge',
    items: [
      { to: '/graph', label: 'Decision graph', icon: 'graph' },
      { to: '/reading', label: 'Saved reading', icon: 'book' },
      { to: '/discover', label: 'Discover', icon: 'compass' },
    ],
  },
  {
    group: 'Team',
    items: [
      { to: '/team', label: 'Team', icon: 'users', managerOnly: true },
      { to: '/manager', label: 'Insights', icon: 'chart' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { to: '/addons', label: 'Add-ons', icon: 'puzzle' },
      { to: '/google', label: 'Google Cloud', icon: 'cloud' },
      { to: '/admin', label: 'Admin', icon: 'shield' },
    ],
  },
];

export const ALL_NAV = [...NAV.flatMap((g) => g.items), { to: '/settings', label: 'Settings', icon: 'settings' }];

export const labelFor = (pathname) => ALL_NAV.find((n) => n.to === pathname)?.label;
