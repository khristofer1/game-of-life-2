// src/hooks/useNavigation.ts
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { getMeta, setMeta } from '../services/db';
import type { TabType } from '../components/layout/BottomNav';

export function useNavigation(user: User | null) {
	// Navigation State
	const [activeTab, setActiveTab] = useState<TabType>('active');
	const [navLayout, setNavLayout] = useState<TabType[]>(['active', 'coming', 'completed']);
	const [isEditNavOpen, setIsEditNavOpen] = useState(false);

	// Load saved preferences on mount
	useEffect(() => {
		if (user) {
			getMeta("navLayout", ['active', 'coming', 'completed']).then((savedLayout) => {
				setNavLayout(savedLayout as TabType[]);
			});
		}
	}, [user]);

	// Save new layout to state and Firebase
	const handleSaveNavLayout = async (newLayout: TabType[]) => {
		setNavLayout(newLayout);
		await setMeta('navLayout', newLayout);
	};

	return {
		activeTab,
		setActiveTab,
		navLayout,
		handleSaveNavLayout,
		isEditNavOpen,
		setIsEditNavOpen
	};
}