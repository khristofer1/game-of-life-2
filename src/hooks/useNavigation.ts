// src/hooks/useNavigation.ts
import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { getMeta, setMeta } from '../services/db';
import type { TabType } from '../components/layout/BottomNav';

export function useNavigation(user: User | null) {
	const [activeTab, setActiveTab] = useState<TabType>('active');
	const [navLayout, setNavLayout] = useState<TabType[]>(['active', 'coming', 'completed']);
	const [isEditNavOpen, setIsEditNavOpen] = useState(false);

	useEffect(() => {
		if (user) {
			getMeta("navLayout", ['active', 'coming', 'completed']).then((savedLayout) => {
				// SAFETY NET: Filter out 'archived' if it was previously saved in their DB
				const safeLayout = (savedLayout as string[]).filter(tab => tab !== 'archived') as TabType[];
				setNavLayout(safeLayout);
			});
		}
	}, [user]);

	const handleSaveNavLayout = async (newLayout: TabType[]) => {
		setNavLayout(newLayout);
		await setMeta('navLayout', newLayout);
	};

	return {
		activeTab, setActiveTab, navLayout, handleSaveNavLayout,
		isEditNavOpen, setIsEditNavOpen
	};
}