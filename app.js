// Term-Held Mathematics Learning Platform
// Version 5.0.0 - Client-side implementation

class TermHeldApp {
    constructor() {
        this.version = "5.0.0";
        this.currentView = "dashboard";
        this.currentBlock = null;
        this.currentSession = {
            tasks: [],
            currentIndex: 0,
            correctCount: 0
        };
        this.tasks = {};
        
        this.initializeApp();
    }

    // Initialize the application
    async initializeApp() {
        await this.loadTasks();
        this.initializeStorage();
        this.bindEvents();
        this.renderDashboard();
        this.showView('dashboard');
    }

    // Load tasks from JSON file
    async loadTasks() {
        try {
            const response = await fetch('tasks.json');
            const data = await response.json();
            this.tasks = data.blocks;
        } catch (error) {
            console.error('Failed to load tasks:', error);
            this.tasks = {};
        }
    }

    // Initialize LocalStorage with default data
    initializeStorage() {
        let stored = localStorage.getItem('termHeldData');
        
        if (!stored) {
            // Create initial data structure
            const initialData = {
                version: this.version,
                progress: {},
                lastSession: new Date().toISOString()
            };

            // Initialize progress for all blocks
            for (let blockId in this.tasks) {
                initialData.progress[`block_${blockId}`] = {
                    unlockedLevel: 1,
                    levelResults: {}, // Track stars per level: {1: 2, 2: 0, 3: 1}
                    currentLevelProgress: [],
                    correctlySolvedTasks: [],
                    recentAnswers: []
                };
            }

            this.saveData(initialData);
            this.data = initialData;
        } else {
            this.data = JSON.parse(stored);
            
            // Version compatibility check
            if (!this.isCompatibleVersion(this.data.version)) {
                this.showFeedback('Import fehlgeschlagen: Dieser Speicherstand stammt von einer inkompatiblen Programmversion und kann nicht geladen werden.', 'error');
                // Reset to initial data
                localStorage.removeItem('termHeldData');
                this.initializeStorage();
                return;
            }
            
            // Migrate old data structure to new level system
            this.migrateToLevelSystem();
        }
    }

    // Check version compatibility (same MAJOR version)
    isCompatibleVersion(dataVersion) {
        const appMajor = parseInt(this.version.split('.')[0]);
        const dataMajor = parseInt(dataVersion.split('.')[0]);
        return appMajor === dataMajor;
    }

    // Calculate stars for a specific level (0-3 stars based on correct answers)
    getLevelStars(blockId, level) {
        const blockData = this.data.progress[`block_${blockId}`];
        if (!blockData || !blockData.levelResults) {
            return 0;
        }

        return blockData.levelResults[level] || 0;
    }

    // Calculate stars based on correct answers count
    calculateStars(correctCount) {
        if (correctCount === 0) return 0;
        if (correctCount >= 5) return 3;
        if (correctCount >= 3) return 2;
        return 1; // 1-2 correct answers
    }
    
    // Migrate old adaptive difficulty system to new fixed level system
    migrateToLevelSystem() {
        for (let blockKey in this.data.progress) {
            const blockProgress = this.data.progress[blockKey];
            
            // Check if migration is needed
            if (blockProgress.hasOwnProperty('currentDifficulty') && !blockProgress.hasOwnProperty('unlockedLevel')) {
                // Migrate from old system
                blockProgress.unlockedLevel = Math.min(5, Math.max(1, blockProgress.currentDifficulty));
                blockProgress.currentLevelProgress = [];
                
                // Remove old properties
                delete blockProgress.currentDifficulty;
                
                console.log(`Migrated ${blockKey} to level system: unlocked level ${blockProgress.unlockedLevel}`);
            }
            
            // Ensure all required properties exist
            if (!blockProgress.hasOwnProperty('unlockedLevel')) {
                blockProgress.unlockedLevel = 1;
            }
            if (!blockProgress.hasOwnProperty('levelResults')) {
                blockProgress.levelResults = {};
            }
            if (!blockProgress.hasOwnProperty('currentLevelProgress')) {
                blockProgress.currentLevelProgress = [];
            }
            if (!blockProgress.hasOwnProperty('correctlySolvedTasks')) {
                blockProgress.correctlySolvedTasks = [];
            }
            if (!blockProgress.hasOwnProperty('recentAnswers')) {
                blockProgress.recentAnswers = [];
            }
        }
        
        // Save migrated data
        this.saveData();
    }

    // Save data to LocalStorage
    saveData(data = this.data) {
        // Limit recent answers to 50 entries per block
        for (let blockKey in data.progress) {
            if (data.progress[blockKey].recentAnswers.length > 50) {
                data.progress[blockKey].recentAnswers = data.progress[blockKey].recentAnswers.slice(-50);
            }
        }
        
        data.lastSession = new Date().toISOString();
        localStorage.setItem('termHeldData', JSON.stringify(data));
        this.data = data;
    }


    // Bind event listeners
    bindEvents() {
        // Navigation
        document.getElementById('settings-btn').onclick = () => this.showSettings();
        document.getElementById('settings-back-btn').onclick = () => this.showView('dashboard');
        document.getElementById('back-btn').onclick = () => this.showExitConfirmation();
        
        // Settings
        document.getElementById('copy-btn').onclick = () => this.copyShareHash();
        document.getElementById('load-btn').onclick = () => this.importProgress();
        document.getElementById('reset-btn').onclick = () => this.resetProgress();
        
        // Task interaction
        document.getElementById('check-btn').onclick = () => this.checkAnswer();
        document.getElementById('hint-btn').onclick = () => this.showHint();
        document.getElementById('close-hint').onclick = () => this.closeHint();
        
        // Close modal on backdrop click
        document.getElementById('hint-modal').onclick = (e) => {
            if (e.target.id === 'hint-modal') this.closeHint();
        };

        // Exit confirmation modal
        document.getElementById('exit-cancel').onclick = () => this.closeExitConfirmation();
        document.getElementById('exit-confirm').onclick = () => this.confirmExitSession();
        document.getElementById('exit-modal').onclick = (e) => {
            if (e.target.id === 'exit-modal') this.closeExitConfirmation();
        };
        
        // Global Enter key handler for task view
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.currentView === 'task') {
                const checkBtn = document.getElementById('check-btn');
                if (checkBtn && !checkBtn.disabled) {
                    checkBtn.click();
                }
            }
        });
    }

    // Show specific view
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewName + '-view').classList.add('active');
        this.currentView = viewName;
    }

    // Render dashboard
    renderDashboard() {
        this.renderTopicBlocks();
        this.updateShareHash();
    }


    // Render topic blocks
    renderTopicBlocks() {
        const container = document.getElementById('topic-blocks');
        container.innerHTML = '';

        for (let blockId in this.tasks) {
            const block = this.tasks[blockId];
            const progress = this.calculateBlockProgress(blockId);

            const blockElement = document.createElement('div');
            blockElement.className = 'topic-block';

            const blockProgress = this.data.progress[`block_${blockId}`];
            const unlockedLevel = blockProgress.unlockedLevel;

            blockElement.innerHTML = `
                <div class="topic-icon">
                    ${this.renderProgressRing(progress)}
                    <div class="topic-icon-symbol">${block.icon}</div>
                </div>
                <div class="topic-info">
                    <h3>${block.title}</h3>
                    <div class="levels-grid">
                        ${this.renderLevelsGrid(blockId, unlockedLevel)}
                    </div>
                </div>
            `;

            container.appendChild(blockElement);
        }
    }

    // Calculate block progress percentage
    calculateBlockProgress(blockId) {
        const blockData = this.data.progress[`block_${blockId}`];
        const unlockedLevel = blockData.unlockedLevel;
        
        // Progress is based on unlocked levels (20% per level) plus current level progress
        const levelsCompleted = Math.max(0, unlockedLevel - 1);
        const baseProgress = (levelsCompleted / 5) * 100;
        
        // Add progress within current level
        const currentLevelTasks = this.tasks[blockId].tasks.filter(t => t.difficulty === unlockedLevel);
        const currentLevelCompleted = blockData.currentLevelProgress ? blockData.currentLevelProgress.length : 0;
        const currentLevelProgress = currentLevelTasks.length > 0 ? 
            (currentLevelCompleted / currentLevelTasks.length) * (100 / 5) : 0;
        
        return Math.round(baseProgress + currentLevelProgress);
    }
    
    // Get current level progress description
    getCurrentLevelProgress(blockId) {
        const blockData = this.data.progress[`block_${blockId}`];
        const currentLevel = blockData.unlockedLevel;
        
        if (currentLevel > 5) {
            return 'Alle Level abgeschlossen!';
        }
        
        const currentLevelTasks = this.tasks[blockId].tasks.filter(t => t.difficulty === currentLevel);
        const completedCount = blockData.currentLevelProgress ? blockData.currentLevelProgress.length : 0;
        
        return `${completedCount}/${currentLevelTasks.length} Aufgaben in Level ${currentLevel}`;
    }

    // Render levels grid with star ratings
    renderLevelsGrid(blockId, unlockedLevel) {
        let html = '';

        for (let level = 1; level <= 5; level++) {
            const isUnlocked = level <= unlockedLevel;
            const stars = this.getLevelStars(blockId, level);
            const isDisabled = !isUnlocked;

            html += `
                <button class="level-btn ${isDisabled ? 'disabled' : ''}"
                        ${isDisabled ? 'disabled' : ''}
                        onclick="app.startLevelSession('${blockId}', ${level})">
                    <div class="level-number">${level}</div>
                    <div class="level-stars">${this.renderStars(stars)}</div>
                </button>
            `;
        }

        return html;
    }

    // Render star display (0-3 filled stars)
    renderStars(starCount) {
        let html = '';
        for (let i = 1; i <= 3; i++) {
            const filled = i <= starCount;
            html += `<span class="star ${filled ? 'filled' : ''}">${filled ? '★' : '☆'}</span>`;
        }
        return html;
    }

    // Render SVG progress ring
    renderProgressRing(percentage) {
        const radius = 32;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        
        return `
            <svg class="progress-ring" width="80" height="80">
                <circle class="progress-ring-circle" cx="40" cy="40" r="${radius}"></circle>
                <circle class="progress-ring-progress" cx="40" cy="40" r="${radius}" 
                        style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle>
            </svg>
        `;
    }

    // Start a learning session for a specific level
    startLevelSession(blockId, level) {
        this.currentBlock = blockId;
        this.currentLevel = level;

        // Check if level is unlocked
        const blockProgress = this.data.progress[`block_${blockId}`];
        if (level > blockProgress.unlockedLevel) {
            this.showFeedback('Dieses Level ist noch nicht freigeschaltet.', 'error');
            return;
        }

        // Select tasks for this session from specified level
        const sessionTasks = this.selectSessionTasks(blockId, level, 5);

        if (sessionTasks.length === 0) {
            this.showFeedback('Keine Aufgaben verfügbar für dieses Level.', 'error');
            return;
        }

        // Start fresh session for this level
        this.currentSession = {
            tasks: sessionTasks,
            currentIndex: 0,
            correctCount: 0,
            errors: 0,
            level: level,
            sessionResults: [] // Track this session's results
        };

        this.showView('task');
        this.renderCurrentTask();
        this.updateSessionProgress();
    }

    // Start a learning session for a specific block (legacy method - redirect to current unlocked level)
    startBlockSession(blockId) {
        const blockProgress = this.data.progress[`block_${blockId}`];
        const currentLevel = blockProgress.unlockedLevel;
        this.startLevelSession(blockId, currentLevel);
    }

    // Select tasks for session from specified level
    selectSessionTasks(blockId, level, maxCount) {
        const blockTasks = this.tasks[blockId].tasks;

        // Filter tasks by specified level only
        const levelTasks = blockTasks.filter(task => task.difficulty === level);

        if (levelTasks.length === 0) {
            return [];
        }

        // For new level session, select exactly 5 tasks for star rating
        const selectedTasks = this.shuffleArray(levelTasks).slice(0, 5);
        return selectedTasks;
    }

    // Shuffle array utility
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Render current task
    renderCurrentTask() {
        const task = this.currentSession.tasks[this.currentSession.currentIndex];
        const questionArea = document.getElementById('question-area');
        const interactionArea = document.getElementById('interaction-area');

        questionArea.innerHTML = `<h2>${task.data.question}</h2>`;

        // Reset check button
        const checkBtn = document.getElementById('check-btn');
        checkBtn.textContent = 'Prüfen';
        checkBtn.disabled = true;
        checkBtn.onclick = () => this.checkAnswer(); // Reset the onclick handler

        // Render task-specific interaction
        this.renderTaskInteraction(task, interactionArea);

        // Clear any previous feedback
        const existingFeedback = interactionArea.querySelector('.feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
    }
    
    // Skip already completed task
    skipCompletedTask() {
        // Move to next task automatically
        this.currentSession.currentIndex++;
        
        if (this.currentSession.currentIndex >= this.currentSession.tasks.length) {
            // Session completed
            this.showSessionSummary();
        } else {
            // Continue to next task
            this.renderCurrentTask();
            this.updateSessionProgress();
        }
    }

    // Render task interaction based on task type
    renderTaskInteraction(task, container) {
        container.innerHTML = '';
        
        switch (task.taskType) {
            case 'solve_expression':
                this.renderSolveExpression(task, container);
                break;
            case 'drag_and_drop':
                this.renderDragAndDrop(task, container);
                break;
            case 'assignment_memory':
                this.renderAssignmentMemory(task, container);
                break;
            case 'find_the_error':
                this.renderFindTheError(task, container);
                break;
            default:
                container.innerHTML = '<p>Unbekannter Aufgabentyp</p>';
        }
    }

    // Render solve expression task
    renderSolveExpression(task, container) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'math-input';
        input.placeholder = 'Deine Antwort...';
        input.oninput = () => {
            document.getElementById('check-btn').disabled = input.value.trim() === '';
        };
        input.onkeypress = (e) => {
            if (e.key === 'Enter' && !document.getElementById('check-btn').disabled) {
                // Execute whatever the current button does (Prüfen or Weiter)
                document.getElementById('check-btn').click();
            }
        };
        
        container.appendChild(input);
        input.focus();
    }

    // Render drag and drop task
    renderDragAndDrop(task, container) {
        // Source area for available blocks
        const sourceArea = document.createElement('div');
        sourceArea.className = 'drag-container';
        sourceArea.dataset.area = 'source';
        
        const sourceLabel = document.createElement('div');
        sourceLabel.textContent = 'Verfügbare Terme:';
        sourceLabel.style.marginBottom = '10px';
        sourceLabel.style.fontWeight = '600';
        sourceLabel.style.color = '#495057';
        
        // Target area label and container
        const targetLabel = document.createElement('div');
        targetLabel.textContent = 'Ordne die Terme hier:';
        targetLabel.style.marginBottom = '10px';
        targetLabel.style.fontWeight = '600';
        targetLabel.style.color = '#495057';
        
        // Target area for dropped blocks
        const targetArea = document.createElement('div');
        targetArea.className = 'drop-zone';
        targetArea.dataset.area = 'target';
        
        // Create draggable blocks
        task.data.initialBlocks.forEach((block, index) => {
            const dragBlock = this.createDragBlock(block, index);
            sourceArea.appendChild(dragBlock);
        });
        
        // Set up drag and drop event handlers
        this.setupDragAndDropArea(sourceArea);
        this.setupDragAndDropArea(targetArea);
        
        container.appendChild(sourceLabel);
        container.appendChild(sourceArea);
        container.appendChild(targetLabel);
        container.appendChild(targetArea);
        
        // Store reference for answer checking
        this.currentDragTask = { sourceArea, targetArea, initialBlocks: task.data.initialBlocks };
    }
    
    // Create a draggable block element
    createDragBlock(blockText, index) {
        const dragBlock = document.createElement('div');
        dragBlock.className = 'drag-block';
        dragBlock.textContent = blockText;
        dragBlock.draggable = true;
        dragBlock.dataset.index = index;
        dragBlock.dataset.value = blockText;
        dragBlock.id = `drag-${index}-${blockText.replace(/\s+/g, '')}`;
        
        dragBlock.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                index: index,
                value: blockText,
                sourceArea: e.target.parentElement.dataset.area,
                elementId: dragBlock.id
            }));
            dragBlock.classList.add('dragging');
        };
        
        dragBlock.ondragend = () => {
            dragBlock.classList.remove('dragging');
        };
        
        return dragBlock;
    }
    
    // Set up drag and drop functionality for an area
    setupDragAndDropArea(area) {
        area.ondragover = (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
            
            // Handle reordering within the same container
            const draggedElement = document.querySelector('.dragging');
            if (draggedElement && draggedElement.parentElement === area) {
                const afterElement = this.getDragAfterElement(area, e.clientX);
                if (afterElement == null) {
                    area.appendChild(draggedElement);
                } else {
                    area.insertBefore(draggedElement, afterElement);
                }
            }
        };
        
        area.ondragleave = (e) => {
            if (!area.contains(e.relatedTarget)) {
                area.classList.remove('drag-over');
            }
        };
        
        area.ondrop = (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const draggedElement = document.getElementById(dragData.elementId);
            
            if (draggedElement) {
                if (draggedElement.parentElement !== area) {
                    // Moving between different areas
                    const afterElement = this.getDragAfterElement(area, e.clientX);
                    if (afterElement == null) {
                        area.appendChild(draggedElement);
                    } else {
                        area.insertBefore(draggedElement, afterElement);
                    }
                }
                // If same area, reordering was already handled in dragover
                
                // Update check button based on target area content
                const targetArea = document.querySelector('[data-area="target"]');
                if (targetArea) {
                    const targetBlocks = targetArea.querySelectorAll('.drag-block');
                    document.getElementById('check-btn').disabled = targetBlocks.length === 0;
                }
            }
        };
    }
    
    // Get the element after which to insert the dragged element
    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.drag-block:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Render assignment memory task
    renderAssignmentMemory(task, container) {
        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        
        // Create shuffled array of all terms
        const allTerms = [];
        task.data.pairs.forEach(pair => {
            allTerms.push({ term: pair.termA, pair: pair.termB, type: 'A' });
            allTerms.push({ term: pair.termB, pair: pair.termA, type: 'B' });
        });
        
        const shuffledTerms = this.shuffleArray(allTerms);
        let selectedCards = [];
        let matchedPairs = [];
        
        shuffledTerms.forEach((termObj, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.textContent = termObj.term;
            card.dataset.pair = termObj.pair;
            card.dataset.index = index;
            
            card.onclick = () => {
                if (card.classList.contains('matched') || card.classList.contains('selected')) return;
                
                card.classList.add('selected');
                selectedCards.push(card);
                
                if (selectedCards.length === 2) {
                    // Immediate feedback - no timeout
                    const [card1, card2] = selectedCards;
                    
                    if (card1.dataset.pair === card2.textContent && card2.dataset.pair === card1.textContent) {
                        // Match found - mark as matched immediately
                        card1.classList.remove('selected');
                        card2.classList.remove('selected');
                        card1.classList.add('matched');
                        card2.classList.add('matched');
                        matchedPairs.push([card1, card2]);
                        
                        // Check if all pairs are matched
                        if (matchedPairs.length === task.data.pairs.length) {
                            // All pairs matched - task completed successfully
                            document.getElementById('check-btn').disabled = false;
                        }
                        
                        selectedCards = [];
                    } else {
                        // Wrong match - end task immediately
                        card1.classList.add('incorrect');
                        card2.classList.add('incorrect');
                        
                        // Disable all remaining cards
                        const allCards = grid.querySelectorAll('.memory-card');
                        allCards.forEach(c => {
                            if (!c.classList.contains('matched')) {
                                c.style.pointerEvents = 'none';
                                c.style.opacity = '0.5';
                            }
                        });
                        
                        // Enable check button for completion (will be marked as failed)
                        document.getElementById('check-btn').disabled = false;
                        selectedCards = [];
                    }
                }
            };
            
            grid.appendChild(card);
        });
        
        container.appendChild(grid);
    }

    // Render find the error task
    renderFindTheError(task, container) {
        // Add instruction text
        const instruction = document.createElement('div');
        instruction.className = 'error-instruction';
        instruction.innerHTML = '<strong>Klicke auf die Zeile mit dem Fehler:</strong>';
        container.appendChild(instruction);
        
        const stepsContainer = document.createElement('div');
        stepsContainer.className = 'calculation-steps';
        
        let selectedLine = null;
        
        task.data.calculationSteps.forEach((step, index) => {
            const line = document.createElement('div');
            
            // First line is the original task/expression - not selectable
            if (index === 0) {
                line.className = 'calculation-line original-task';
                line.innerHTML = `<span class="step-label">Ausgangsterm:</span><span class="step-content">${step.line}</span>`;
            } else {
                line.className = 'calculation-line';
                line.innerHTML = `<span class="step-number">Schritt ${index}:</span><span class="step-content">${step.line}</span>`;
                line.dataset.index = index;
                line.dataset.correct = step.isCorrect;
                
                line.onclick = () => {
                    // Clear previous selection
                    stepsContainer.querySelectorAll('.calculation-line:not(.original-task)').forEach(l => {
                        l.classList.remove('selected');
                    });
                    
                    line.classList.add('selected');
                    selectedLine = index;
                    document.getElementById('check-btn').disabled = false;
                };
            }
            
            stepsContainer.appendChild(line);
        });
        
        container.appendChild(stepsContainer);
        container.selectedLine = () => selectedLine;
    }

    // Update session progress bar
    updateSessionProgress() {
        // Progress shows how far we are through the session
        // Task 1/5 = 20%, Task 2/5 = 40%, ..., Task 5/5 = 100%
        const currentTask = this.currentSession.currentIndex + 1;
        const totalTasks = this.currentSession.tasks.length;
        const progress = (currentTask / totalTasks) * 100;
        
        document.getElementById('session-progress').style.width = progress + '%';
        document.getElementById('task-counter').textContent = `${currentTask}/${totalTasks}`;
    }

    // Check user's answer
    checkAnswer() {
        const task = this.currentSession.tasks[this.currentSession.currentIndex];
        const interactionArea = document.getElementById('interaction-area');
        let isCorrect = false;
        let userAnswer = '';
        
        // Get answer based on task type
        switch (task.taskType) {
            case 'solve_expression':
                const input = interactionArea.querySelector('.math-input');
                userAnswer = input.value.trim().toLowerCase().replace(/\s/g, '');
                const correctAnswer = task.data.solution.toLowerCase().replace(/\s/g, '');
                isCorrect = userAnswer === correctAnswer;
                break;
                
            case 'drag_and_drop':
                const targetArea = interactionArea.querySelector('[data-area="target"]');
                const droppedBlocks = Array.from(targetArea.querySelectorAll('.drag-block'))
                    .map(block => block.dataset.value);
                userAnswer = droppedBlocks.join('');
                isCorrect = userAnswer.replace(/\s/g, '') === task.data.finalSolution.replace(/\s/g, '');
                break;
                
            case 'assignment_memory':
                const matchedCards = interactionArea.querySelectorAll('.memory-card.matched');
                const incorrectCards = interactionArea.querySelectorAll('.memory-card.incorrect');
                
                if (incorrectCards.length > 0) {
                    // Failed due to incorrect selection
                    isCorrect = false;
                    userAnswer = 'Falsche Zuordnung';
                } else {
                    // Success only if all pairs are matched
                    isCorrect = matchedCards.length === task.data.pairs.length * 2;
                    userAnswer = isCorrect ? 'Alle Paare richtig zugeordnet' : 'Nicht alle Paare gefunden';
                }
                break;
                
            case 'find_the_error':
                const selectedLineIndex = interactionArea.selectedLine();
                if (selectedLineIndex !== null) {
                    const step = task.data.calculationSteps[selectedLineIndex];
                    isCorrect = !step.isCorrect; // User should select the incorrect line
                    userAnswer = `Line ${selectedLineIndex + 1}`;
                }
                break;
        }
        
        // Process answer
        this.processAnswer(task, isCorrect, userAnswer);
    }

    // Process the answer and update progress
    processAnswer(task, isCorrect, userAnswer) {
        const interactionArea = document.getElementById('interaction-area');
        const checkBtn = document.getElementById('check-btn');

        // Record answer for this session
        this.currentSession.sessionResults.push({
            taskId: task.id,
            correct: isCorrect
        });

        // Update session progress
        if (isCorrect) {
            this.currentSession.correctCount++;
        } else {
            this.currentSession.errors++;
        }

        // Show feedback
        this.showTaskFeedback(task, isCorrect, interactionArea);

        // Save progress
        this.saveData();

        // Update button - always becomes "Weiter" after checking answer
        checkBtn.textContent = 'Weiter';
        checkBtn.onclick = () => this.nextTask();
        // Disable button briefly to prevent immediate Enter triggering
        checkBtn.disabled = true;
        setTimeout(() => {
            checkBtn.disabled = false;
        }, 500); // Half second delay to show feedback

        // Add visual feedback to input/interaction
        if (task.taskType === 'solve_expression') {
            const input = interactionArea.querySelector('.math-input');
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
            input.disabled = true; // Disable input after answer to prevent further typing
        } else if (task.taskType === 'find_the_error') {
            const lines = interactionArea.querySelectorAll('.calculation-line.selected');
            lines.forEach(line => {
                line.classList.add(isCorrect ? 'correct-selection' : 'incorrect-selection');
            });
        }
    }

    // Show task-specific feedback
    showTaskFeedback(task, isCorrect, container) {
        const feedback = document.createElement('div');
        feedback.className = `feedback ${isCorrect ? 'success' : 'error'}`;
        
        if (isCorrect) {
            const encouragements = ['Richtig!', 'Super!', 'Gut gemacht!', 'Perfekt!', 'Klasse!'];
            feedback.textContent = encouragements[Math.floor(Math.random() * encouragements.length)];
        } else {
            feedback.textContent = 'Das ist noch nicht richtig.';
            
            // Show error explanation for find_the_error tasks
            if (task.taskType === 'find_the_error' && task.data.errorExplanation) {
                feedback.innerHTML += '<br><br>' + task.data.errorExplanation;
            } else if (task.taskType === 'solve_expression') {
                feedback.innerHTML += '<br>Die richtige Antwort ist: ' + task.data.solution;
            }
        }
        
        container.appendChild(feedback);
    }



    // Move to next task
    nextTask() {
        this.currentSession.currentIndex++;
        
        if (this.currentSession.currentIndex >= this.currentSession.tasks.length) {
            // Session completed
            this.showSessionSummary();
        } else {
            // Continue to next task
            this.renderCurrentTask();
            this.updateSessionProgress();
        }
    }

    // Show session summary
    showSessionSummary() {
        const interactionArea = document.getElementById('interaction-area');

        const totalTasks = this.currentSession.tasks.length;
        const correctCount = this.currentSession.correctCount;
        const level = this.currentSession.level;
        const stars = this.calculateStars(correctCount);

        // Update level results in saved data
        const blockProgress = this.data.progress[`block_${this.currentBlock}`];
        const currentStars = blockProgress.levelResults[level] || 0;

        // Only update if this session achieved more stars
        if (stars > currentStars) {
            blockProgress.levelResults[level] = stars;

            // Check if should unlock next level (need at least 1 star to unlock)
            if (stars > 0 && level === blockProgress.unlockedLevel && level < 5) {
                blockProgress.unlockedLevel = level + 1;
            }
        }

        this.saveData();

        let summaryMessage = `Level ${level} abgeschlossen!<br><br>`;
        summaryMessage += `Du hast ${correctCount} von ${totalTasks} Aufgaben richtig gelöst.<br><br>`;
        summaryMessage += `<div class="session-stars">Erreichte Sterne: ${this.renderStars(stars)}</div><br>`;

        if (stars > currentStars) {
            summaryMessage += `<strong>Neue Bestleistung!</strong> Du hast ${stars} Stern${stars > 1 ? 'e' : ''} erreicht!<br><br>`;

            if (stars > 0 && level === blockProgress.unlockedLevel - 1 && level < 5) {
                summaryMessage += `<strong>Level ${level + 1} freigeschaltet!</strong>`;
            }
        } else if (currentStars > 0) {
            summaryMessage += `Bisherige Bestleistung: ${this.renderStars(currentStars)}`;
        }

        interactionArea.innerHTML = `
            <div class="feedback success">
                <h3>Session abgeschlossen!</h3>
                <p>${summaryMessage}</p>
            </div>
        `;

        document.getElementById('check-btn').textContent = 'Zurück zum Dashboard';
        document.getElementById('check-btn').onclick = () => this.exitTaskSession();
    }

    // Exit task session and return to dashboard
    exitTaskSession() {
        this.currentSession = { tasks: [], currentIndex: 0, correctCount: 0 };
        this.currentBlock = null;
        this.renderDashboard();
        this.showView('dashboard');
    }

    // Show hint modal
    showHint() {
        const task = this.currentSession.tasks[this.currentSession.currentIndex];
        const hintContent = document.getElementById('hint-content');

        hintContent.innerHTML = '';
        task.hints.forEach((hint, index) => {
            const hintElement = document.createElement('p');
            hintElement.textContent = `${index + 1}. ${hint}`;
            hintContent.appendChild(hintElement);
        });

        document.getElementById('hint-modal').style.display = 'flex';
    }

    // Close hint modal
    closeHint() {
        document.getElementById('hint-modal').style.display = 'none';
    }

    // Show exit confirmation modal
    showExitConfirmation() {
        document.getElementById('exit-modal').style.display = 'flex';
    }

    // Close exit confirmation modal
    closeExitConfirmation() {
        document.getElementById('exit-modal').style.display = 'none';
    }

    // Confirm exit session (abandon progress)
    confirmExitSession() {
        this.closeExitConfirmation();
        this.exitTaskSession();
    }

    // Show settings page
    showSettings() {
        this.updateShareHash();
        this.showView('settings');
    }

    // Update share hash in settings
    updateShareHash() {
        try {
            const compressed = pako.deflate(JSON.stringify(this.data));
            const base64 = btoa(String.fromCharCode(...compressed));
            document.getElementById('share-hash').value = base64;
        } catch (error) {
            console.error('Failed to generate share hash:', error);
            document.getElementById('share-hash').value = 'Fehler beim Generieren';
        }
    }

    // Copy share hash to clipboard
    async copyShareHash() {
        const shareHash = document.getElementById('share-hash').value;
        try {
            await navigator.clipboard.writeText(shareHash);
            this.showFeedback('Share-Code wurde in die Zwischenablage kopiert!', 'success');
        } catch (error) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareHash;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showFeedback('Share-Code wurde in die Zwischenablage kopiert!', 'success');
        }
    }

    // Import progress from share hash
    importProgress() {
        const shareHash = document.getElementById('import-hash').value.trim();
        
        if (!shareHash) {
            this.showFeedback('Bitte gib einen Share-Code ein.', 'error');
            return;
        }
        
        try {
            // Decode and decompress
            const compressed = Uint8Array.from(atob(shareHash), c => c.charCodeAt(0));
            const jsonString = pako.inflate(compressed, { to: 'string' });
            const importedData = JSON.parse(jsonString);
            
            // Validate structure and version
            if (!importedData.version || !this.isCompatibleVersion(importedData.version)) {
                this.showFeedback('Import fehlgeschlagen: Dieser Speicherstand stammt von einer inkompatiblen Programmversion und kann nicht geladen werden.', 'error');
                return;
            }
            
            // Import data
            this.data = importedData;
            this.saveData();
            
            // Refresh dashboard
            this.renderDashboard();
            this.showFeedback('Fortschritt erfolgreich importiert!', 'success');
            document.getElementById('import-hash').value = '';
            
        } catch (error) {
            console.error('Import failed:', error);
            this.showFeedback('Import fehlgeschlagen: Ungültiger Share-Code.', 'error');
        }
    }

    // Reset all progress
    resetProgress() {
        if (confirm('Bist du sicher, dass du deinen gesamten Fortschritt löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            // Clear localStorage
            localStorage.removeItem('termHeldData');
            
            // Reinitialize app data
            this.initializeStorage();
            
            // Refresh dashboard
            this.renderDashboard();
            this.showView('dashboard');
            
            this.showFeedback('Alle Daten wurden gelöscht. Du beginnst wieder bei 0!', 'success');
        }
    }

    // Show feedback message
    showFeedback(message, type = 'success') {
        // Remove existing feedback
        const existingFeedback = document.querySelector('.global-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        const feedback = document.createElement('div');
        feedback.className = `feedback ${type} global-feedback`;
        feedback.textContent = message;
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.left = '50%';
        feedback.style.transform = 'translateX(-50%)';
        feedback.style.zIndex = '9999';
        feedback.style.maxWidth = '90%';
        feedback.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        
        document.body.appendChild(feedback);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.remove();
            }
        }, 5000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TermHeldApp();
    window.termHeldApp = window.app; // Keep backward compatibility
});