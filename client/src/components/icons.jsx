// Minimal inline icon set (stroke-based, inherits currentColor).
const S = ({ children, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);

export const Car = (p) => <S {...p}><path d="M5 17h14M6 17l1.5-5h9L18 17M3 13h2m14 0h2"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/></S>;
export const Home = (p) => <S {...p}><path d="M4 11l8-6 8 6M6 10v9h12v-9"/></S>;
export const Grid = (p) => <S {...p}><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></S>;
export const Pin = (p) => <S {...p}><path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></S>;
export const Chart = (p) => <S {...p}><path d="M5 19V9m5 10V5m5 14v-7m5 7V8"/></S>;
export const Moon = (p) => <S {...p}><path d="M21 12.8A8.5 8.5 0 1111.2 3a6.5 6.5 0 009.8 9.8z"/></S>;
export const Sun = (p) => <S {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></S>;
export const Phone = (p) => <S {...p}><path d="M6 3h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z"/></S>;
export const Chat = (p) => <S {...p}><path d="M5 5h14v9H9l-4 4V5z"/></S>;
export const Nav = (p) => <S {...p}><path d="M12 3l8 18-8-4-8 4 8-18z"/></S>;
export const Bolt = (p) => <S {...p}><path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z"/></S>;
export const Users = (p) => <S {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0M16 6a3 3 0 010 6m5 8a5 5 0 00-4-5"/></S>;
export const Clock = (p) => <S {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></S>;
export const Leaf = (p) => <S {...p}><path d="M4 20s0-9 8-12c4-1.5 8-1 8-1s.5 4-1 8c-3 8-12 8-12 8z"/><path d="M9 15c3-3 6-4 6-4"/></S>;
export const Star = ({ filled, ...p }) => <S {...p} fill={filled ? 'currentColor' : 'none'}><path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 16.8 6.6 19.4l1.2-6L3.4 9.3l6-.7L12 3z"/></S>;
export const Shield = (p) => <S {...p}><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></S>;
export const Trend = (p) => <S {...p}><path d="M4 16l5-5 3 3 7-7m0 0h-4m4 0v4"/></S>;
export const Check = (p) => <S {...p}><path d="M4 12l5 5L20 6"/></S>;
export const X = (p) => <S {...p}><path d="M6 6l12 12M18 6L6 18"/></S>;
export const Plus = (p) => <S {...p}><path d="M12 5v14M5 12h14"/></S>;
export const Share = (p) => <S {...p}><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/></S>;
export const Activity = (p) => <S {...p}><path d="M3 12h4l3 8 4-16 3 8h4"/></S>;
export const Wallet = (p) => <S {...p}><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M16 12h3"/></S>;
export const Logout = (p) => <S {...p}><path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M9 12h11M9 12l3-3m-3 3l3 3"/></S>;
