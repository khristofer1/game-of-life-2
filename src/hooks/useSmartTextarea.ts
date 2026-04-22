// src/hooks/useSmartTextarea.ts
import { useState } from 'react';
import { flushSync } from 'react-dom';

export function useSmartTextarea(initialValue: string = '') {
	const [desc, setDesc] = useState(initialValue);

	const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const target = e.target;
		const cursorPosition = target.selectionStart;
		const originalValue = target.value;
		
		const scrollContainer = target.closest('.overflow-y-auto');
		const scrollPosition = scrollContainer ? scrollContainer.scrollTop : 0;
		
		const newValue = originalValue.replace(/(^|\n)\* /g, '$1• ');

		if (newValue !== originalValue) {
			flushSync(() => {
				setDesc(newValue);
			});
			
			target.selectionStart = target.selectionEnd = cursorPosition;
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollPosition;
			}
		} else {
			setDesc(newValue);
		}
	};

	const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const target = e.target as HTMLTextAreaElement;
		const cursorPosition = target.selectionStart;
		
		const textBeforeCursor = target.value.substring(0, cursorPosition);
		const textAfterCursor = target.value.substring(cursorPosition);

		const lines = textBeforeCursor.split('\n');
		const currentLine = lines[lines.length - 1];

		if (e.key === 'Enter') {
			if (currentLine.startsWith('• ')) {
				e.preventDefault(); 

				if (currentLine === '• ') {
					const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.length - 2);
					setDesc(newTextBefore + textAfterCursor);
					
					setTimeout(() => {
						target.selectionStart = target.selectionEnd = newTextBefore.length;
					}, 0);
				} else {
					setDesc(textBeforeCursor + '\n• ' + textAfterCursor);
					
					setTimeout(() => {
						target.selectionStart = target.selectionEnd = cursorPosition + 3;
					}, 0);
				}
			}
		} else if (e.key === 'Backspace') {
			if (currentLine === '• ') {
				e.preventDefault(); 
				const newTextBefore = textBeforeCursor.substring(0, textBeforeCursor.length - 2);
				setDesc(newTextBefore + textAfterCursor);
				
				setTimeout(() => {
					target.selectionStart = target.selectionEnd = newTextBefore.length;
				}, 0);
			}
		}
	};

	return { desc, setDesc, handleDescChange, handleDescKeyDown };
}