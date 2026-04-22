// src/components/layout/Header.tsx
import { useState, useRef, useEffect } from 'react';
import { logoutFromGoogle } from '../../services/firebase';
import { setMeta } from '../../services/db';
import successSound from '../../assets/success.mp3';
import logo from '../../assets/logo.svg';
import { formatShortTimeDeposit } from '../../utils/timeFormat';

interface HeaderProps {
	gems: number;
	timeDeposit: number;
	volumeLevel: number;
	setVolumeLevel: (level: number) => void;
	onOpenSummary: () => void;
	onOpenGemShop: () => void;
	onOpenTimeVault: () => void;
}

export function Header({
	gems, timeDeposit, volumeLevel, setVolumeLevel,
	onOpenSummary, onOpenGemShop, onOpenTimeVault
}: HeaderProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const settingsRef = useRef<HTMLDivElement>(null);

	// Isolating the dropdown logic here keeps App.tsx clean!
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
				
				{/* LOGO AREA */}
				<button
					onClick={onOpenSummary}
					className="flex items-center gap-2 sm:gap-3 focus:outline-none group transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
					title="View Daily Summary"
				>
					<img src={logo} alt="Game of Life Logo" className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500 group-hover:drop-shadow-md transition-all" />
					<h1 className="text-xl sm:text-2xl font-bold tracking-tight text-dark hidden sm:block group-hover:text-orange-600 transition-colors">
						Game of Life
					</h1>
				</button>

				{/* REWARDS AREA */}
				<div className="flex items-center gap-1.5 sm:gap-4">
					
					<button
						onClick={onOpenGemShop}
						className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-orange-50 text-orange-600 rounded-full font-bold shadow-sm border border-orange-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
					>
						<span className="text-xs sm:text-sm">💎</span>
						<span className="text-sm sm:text-base">{gems}</span>
					</button>

					<button
						onClick={onOpenTimeVault}
						className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-blue-600 rounded-full font-bold shadow-sm border border-blue-100 transition-all cursor-pointer hover:scale-105 active:scale-95"
						title="View Time Vault"
					>
						<span className="text-xs sm:text-sm">⏳</span>
						<span className="text-sm sm:text-base">{formatShortTimeDeposit(timeDeposit)}</span>
					</button>

					{/* SETTINGS GEAR */}
					<div className="relative ml-1 sm:ml-0" ref={settingsRef}>
						<button
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
							className="text-xl sm:text-2xl p-1 hover:bg-gray-100 rounded-full transition-all focus:outline-none cursor-pointer hover:scale-110 active:scale-95 grayscale hover:grayscale-0"
							title="Settings"
						>
							⚙️
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