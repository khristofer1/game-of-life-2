// src/components/layout/Header.tsx
import { useState, useRef, useEffect } from 'react';
import { logoutFromGoogle } from '../../services/firebase';
import { setMeta } from '../../services/db';
import successSound from '../../assets/success.mp3';
import logo from '../../assets/logo.svg';

interface HeaderProps {
	gems: number;
	timePoints: number;
	medals: { bronze: number; silver: number; gold: number };
	volumeLevel: number;
	setVolumeLevel: (level: number) => void;
	onOpenSummary: () => void;
	onOpenGemShop: () => void;
	onOpenTimeVault: () => void;
	onOpenEditNav: () => void;
}

export function Header({
	gems, timePoints, medals, volumeLevel, setVolumeLevel,
	onOpenSummary, onOpenGemShop, onOpenTimeVault, onOpenEditNav
}: HeaderProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
				setIsSettingsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 mb-8">
			<div className="max-w-7xl mx-auto flex justify-between items-center">
				
				<button
					onClick={onOpenSummary}
					className="flex items-center gap-2 sm:gap-3 focus:outline-none group transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
					title="View Daily Summary"
				>
					<img src={logo} alt="Game of Life Logo" className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 group-hover:drop-shadow-md transition-all" />
					<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-dark hidden lg:block group-hover:text-orange-600 transition-colors">
						Game of Life
					</h1>
				</button>

				<div className="flex items-center gap-1.5 sm:gap-4">
					
					{/* CURRENCY BUTTONS */}
          <button 
            onClick={onOpenGemShop}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 px-3 sm:px-4 py-2 rounded-2xl border border-blue-100 transition-all active:scale-95 group"
          >
            <span className="text-sm group-hover:scale-120 transition-transform">💎</span>
            <span className="text-sm font-bold text-blue-600">{gems}</span>
          </button>

          <button 
            onClick={onOpenTimeVault}
            className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 px-3 sm:px-4 py-2 rounded-2xl border border-orange-100 transition-all active:scale-95 group"
          >
            <span className="text-sm group-hover:rotate-12 transition-transform">⏳</span>
            <span className="text-sm font-bold text-orange-600">{timePoints}</span>
          </button>

					{/* MEDALS HUD - Integrated into the main bar */}
					<div className="hidden md:flex items-center gap-2 border-gray-100">
						<div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100" title="Bronze Medals">
							<span className="text-xs sm:text-sm">🥉</span>
							<span className="text-xs font-bold text-amber-800">{medals.bronze}</span>
						</div>
						<div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200" title="Silver Medals">
							<span className="text-xs sm:text-sm">🥈</span>
							<span className="text-xs font-bold text-slate-700">{medals.silver}</span>
						</div>
						<div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200" title="Gold Medals">
							<span className="text-xs sm:text-sm">🥇</span>
							<span className="text-xs font-bold text-yellow-700">{medals.gold}</span>
						</div>
					</div>

					<div className="relative ml-1 sm:ml-0" ref={settingsRef}>
						<button
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
							className="p-2 text-gray-400 hover:text-dark transition-colors"
							title="Settings"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</button>

						{isSettingsOpen && (
							<div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in flex flex-col">
								<div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
									<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block text-center">
										Sound Effects
									</span>
									<div className="flex justify-between items-center gap-1">
										{[0, 1, 2, 3, 4, 5].map((level) => (
											<button
												key={level}
												onClick={async () => {
													setVolumeLevel(level);
													await setMeta("volumeLevel", level);
													if (level > 0) {
														const testAudio = new Audio(successSound);
														testAudio.volume = [0, 0.2, 0.4, 0.6, 0.8, 1.0][level];
														testAudio.play().catch(() => { });
													}
												}}
												className={`w-8 h-8 rounded-full text-xs flex items-center justify-center transition-all ${volumeLevel === level
														? 'bg-orange-500 text-white font-bold shadow-md scale-110'
														: 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'
													}`}
											>
												{level === 0 ? '🔇' : level}
											</button>
										))}
									</div>
								</div>

								<button
									onClick={() => {
										onOpenEditNav();
										setIsSettingsOpen(false);
									}}
									className="px-4 py-3 text-sm font-bold text-left text-dark hover:bg-blue-100 transition-colors border-b border-gray-100 flex items-center gap-3"
								>
									<span className="text-lg">📱</span> Edit Navigation
								</button>

								<button
									onClick={logoutFromGoogle}
									className="px-4 py-3 text-sm font-bold text-left text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3"
								>
									<span className="text-lg">🚪</span> Logout
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}