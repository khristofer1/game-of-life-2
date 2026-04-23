// src/components/layout/BottomNav.tsx
import { useState, useRef, useEffect } from 'react';

export type TabType = 'active' | 'coming' | 'completed' | 'break' | 'deleted' | 'archived' | 'shop';

interface BottomNavProps {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const moreMenuRef = useRef<HTMLDivElement>(null);

	// Self-contained click-outside listener just for the More Menu!
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
			<button
				onClick={() => setActiveTab('active')}
				className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'active' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
				</svg>
				<span className="uppercase tracking-wider">Active</span>
			</button>

			<button
				onClick={() => setActiveTab('coming')}
				className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'coming' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
				<span className="uppercase tracking-wider">Coming</span>
			</button>

			<button
				onClick={() => setActiveTab('completed')}
				className={`flex-1 flex flex-col items-center gap-1 transition-all ${activeTab === 'completed' ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
				</svg>
				<span className="uppercase tracking-wider">Completed</span>
			</button>

			<div className="flex-1 flex justify-center relative" ref={moreMenuRef}>
				<button
					onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
					className={`flex flex-col items-center gap-1 transition-all ${(activeTab === 'deleted' || activeTab === 'break' || activeTab === 'archived') ? 'text-orange-500 scale-105' : 'text-gray-400 hover:text-dark'}`}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
					</svg>
					<span className="uppercase tracking-wider">More</span>
				</button>

				{isMoreMenuOpen && (
					<div className="absolute bottom-full mb-4 right-4 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in flex flex-col">
						<button
							onClick={() => { setActiveTab('shop'); setIsMoreMenuOpen(false); }}
							className={`px-4 py-3 text-sm font-bold text-left hover:bg-purple-50 transition-colors flex items-center gap-2 ${activeTab === 'shop' ? 'text-purple-500 bg-purple-50/50' : 'text-dark'}`}
						>
							<span className="text-lg">🏪</span> Loot Shop
						</button>
						
						<button
							onClick={() => { setActiveTab('break'); setIsMoreMenuOpen(false); }}
							className={`px-4 py-3 text-sm font-bold text-left hover:bg-orange-50 transition-colors flex items-center gap-2 ${activeTab === 'break' ? 'text-orange-500 bg-orange-50/50' : 'text-dark'}`}
						>
							<span className="text-lg">☕</span> Break
						</button>
						<button
							onClick={() => { setActiveTab('archived'); setIsMoreMenuOpen(false); }}
							className={`px-4 py-3 text-sm font-bold text-left hover:bg-blue-50 transition-colors border-t border-gray-100 flex items-center gap-2 ${activeTab === 'archived' ? 'text-blue-500 bg-blue-50/50' : 'text-dark'}`}
						>
							<span className="text-lg">🏛️</span> Archived
						</button>
						<button
							onClick={() => { setActiveTab('deleted'); setIsMoreMenuOpen(false); }}
							className={`px-4 py-3 text-sm font-bold text-left hover:bg-red-50 transition-colors border-t border-gray-100 flex items-center gap-2 ${activeTab === 'deleted' ? 'text-red-500 bg-red-50/50' : 'text-dark'}`}
						>
							<span className="text-lg">🗑️</span> Deleted
						</button>
					</div>
				)}
			</div>
		</nav>
	);
}