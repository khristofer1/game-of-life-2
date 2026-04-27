// src/hooks/useAppState.ts
import { useState } from 'react';
import type { Quest } from '../types/quest';
import type { TabType } from '../components/layout/BottomNav';

export function useAppState(allTasks: Quest[], activeTab: TabType) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
	const [modalDefaultIsBreak, setModalDefaultIsBreak] = useState(false);
	const [isBankModalOpen, setIsBankModalOpen] = useState(false);
	const [isGemShopOpen, setIsGemShopOpen] = useState(false);

	const handleFabClick = () => {
		if (activeTab === 'break') {
			setModalDefaultIsBreak(true);
		} else {
			setModalDefaultIsBreak(false);
		}
		setEditingQuest(null);
		setIsModalOpen(true);
	};

	const handleEdit = (id: number) => {
		const quest = allTasks.find(t => t.id === id);
		if (quest) {
			setEditingQuest(quest);
			setIsModalOpen(true);
		}
	};

	return {
		isModalOpen,
		setIsModalOpen,
		editingQuest,
		setEditingQuest,
		modalDefaultIsBreak,
		isBankModalOpen,
		setIsBankModalOpen,
		isGemShopOpen,
		setIsGemShopOpen,
		handleFabClick,
		handleEdit
	};
}