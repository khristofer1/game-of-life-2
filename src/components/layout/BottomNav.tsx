// src/components/layout/BottomNav.tsx
import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';

export type TabType = 'active' | 'coming' | 'completed' | 'break' | 'deleted' | 'archived' | 'shop';

interface BottomNavProps {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
	navLayout: TabType[];
}

// Map configuration for dynamic rendering
const TAB_CONFIG: Record<TabType, { label: string, emoji: string, icon: ReactNode }> = {
	active: { label: 'Active', emoji: '📝', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
	coming: { label: 'Coming', emoji: '⏳', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
	completed: { label: 'Done', emoji: '✅', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> },
	shop: { label: 'Shop', emoji: '🏪', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
	break: { label: 'Break', emoji: '☕', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
	archived: { label: 'Archived', emoji: '🏛️', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /> },
	deleted: { label: 'Deleted', emoji: '🗑️', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> },
};

// Colors for the "More" menu
const TAB_COLORS: Partial<Record<TabType, string>> = {
	shop: 'text-purple-500 hover:bg-purple-50',
	break: 'text-orange-500 hover:bg-orange-50',
	archived: 'text-blue-500 hover:bg-blue-50',
	deleted: 'text-red-500 hover:bg-red-50',
	coming: 'text-teal-500 hover:bg-teal-50',
	completed: 'text-green-500 hover:bg-green-50'
};

export function BottomNav({ activeTab, setActiveTab, navLayout }: BottomNavProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	// All available tabs minus the ones already on the bar
	const allTabs: TabType[] = ['coming', 'completed', 'shop', 'break', 'archived', 'deleted'];
	const overflowTabs = allTabs.filter(tab => !navLayout.includes(tab));

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 z-50 px-6 py-2 flex justify-between items-center text-xs font-semibold pb-safe">
			
			{/* DYNAMIC TABS LOOP */}
			{navLayout.map(tab => (
				<button
					key={tab}
					onClick={() => setActiveTab(tab)}
					className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						{TAB_CONFIG[tab].icon}
					</svg>
					<span className="uppercase tracking-wider text-[10px] sm:text-xs">{TAB_CONFIG[tab].label}</span>
				</button>
			))}

			{/* MORE MENU (Fixed as 4th slot) */}
			<div className="flex-1 flex justify-center relative" ref={moreMenuRef}>
				<button
					onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
					className={`flex flex-col items-center gap-1 transition-all ${overflowTabs.includes(activeTab) ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
					</svg>
					<span className="uppercase tracking-wider text-[10px] sm:text-xs">More</span>
				</button>

				{isMoreMenuOpen && (
					<div className="absolute bottom-full mb-4 right-4 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in flex flex-col">
						{overflowTabs.map(tab => (
							<button
								key={tab}
								onClick={() => { setActiveTab(tab); setIsMoreMenuOpen(false); }}
								className={`px-4 py-3 text-sm font-bold text-left transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0 ${activeTab === tab ? 'bg-gray-100 text-dark' : 'text-gray-600'} ${TAB_COLORS[tab]}`}
							>
								<span className="text-lg">{TAB_CONFIG[tab].emoji}</span> 
								<span className="capitalize">{TAB_CONFIG[tab].label}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</nav>
	);
}