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
                    currentDifficulty: 1,
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
        }
    }

    // Check version compatibility (same MAJOR version)
    isCompatibleVersion(dataVersion) {
        const appMajor = parseInt(this.version.split('.')[0]);
        const dataMajor = parseInt(dataVersion.split('.')[0]);
        return appMajor === dataMajor;
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
        document.getElementById('back-btn').onclick = () => this.exitTaskSession();
        
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
            blockElement.onclick = () => this.startBlockSession(blockId);
            
            blockElement.innerHTML = `
                <div class="topic-icon">
                    ${this.renderProgressRing(progress)}
                    <div class="topic-icon-symbol">${block.icon}</div>
                </div>
                <div class="topic-info">
                    <h3>${block.title}</h3>
                    <p>Level ${this.data.progress[`block_${blockId}`].currentDifficulty}/5 erreicht</p>
                </div>
            `;
            
            container.appendChild(blockElement);
        }
    }

    // Calculate block progress percentage
    calculateBlockProgress(blockId) {
        const blockData = this.data.progress[`block_${blockId}`];
        const totalTasks = this.tasks[blockId].tasks.length;
        const solvedTasks = blockData.correctlySolvedTasks.length;
        return Math.round((solvedTasks / totalTasks) * 100);
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

    // Start a learning session for a specific block
    startBlockSession(blockId) {
        this.currentBlock = blockId;
        const blockProgress = this.data.progress[`block_${blockId}`];
        const currentDifficulty = blockProgress.currentDifficulty;
        
        // Select tasks for this session (aim for 10, but adapt to available tasks)
        const sessionTasks = this.selectSessionTasks(blockId, currentDifficulty, 10);
        
        
        if (sessionTasks.length === 0) {
            this.showFeedback('Keine neuen Aufgaben verfügbar. Probiere einen anderen Schwierigkeitsgrad.', 'error');
            return;
        }
        
        this.currentSession = {
            tasks: sessionTasks,
            currentIndex: 0,
            correctCount: 0
        };
        
        this.showView('task');
        this.renderCurrentTask();
        this.updateSessionProgress();
    }

    // Select tasks for session based on difficulty and recent history
    selectSessionTasks(blockId, targetDifficulty, maxCount) {
        const blockTasks = this.tasks[blockId].tasks;
        const recentTaskIds = this.data.progress[`block_${blockId}`].recentAnswers.slice(-5).map(answer => answer.taskId);
        
        // Filter tasks by difficulty
        const allDifficultyTasks = blockTasks.filter(task => task.difficulty === targetDifficulty);
        
        if (allDifficultyTasks.length === 0) {
            // No tasks for this difficulty, try adjacent difficulties
            const adjacentTasks = blockTasks.filter(task => 
                Math.abs(task.difficulty - targetDifficulty) <= 1
            );
            return this.shuffleArray(adjacentTasks).slice(0, Math.min(maxCount, adjacentTasks.length));
        }
        
        // If we have 5 or fewer tasks for this difficulty, use all of them
        // (don't filter by recent history for small sets)
        if (allDifficultyTasks.length <= 5) {
            return this.shuffleArray(allDifficultyTasks);
        }
        
        // For larger sets, prefer tasks not recently answered
        const availableTasks = allDifficultyTasks.filter(task => !recentTaskIds.includes(task.id));
        
        // If we have fresh tasks, use them
        if (availableTasks.length > 0) {
            const sessionSize = Math.min(maxCount, availableTasks.length);
            return this.shuffleArray(availableTasks).slice(0, sessionSize);
        }
        
        // If all tasks were recent, use all available tasks for this difficulty
        const sessionSize = Math.min(maxCount, allDifficultyTasks.length);
        return this.shuffleArray(allDifficultyTasks).slice(0, sessionSize);
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
                    setTimeout(() => {
                        const [card1, card2] = selectedCards;
                        
                        if (card1.dataset.pair === card2.textContent && card2.dataset.pair === card1.textContent) {
                            // Match found
                            card1.classList.remove('selected');
                            card2.classList.remove('selected');
                            card1.classList.add('matched');
                            card2.classList.add('matched');
                            matchedPairs.push([card1, card2]);
                            
                            if (matchedPairs.length === task.data.pairs.length) {
                                document.getElementById('check-btn').disabled = false;
                            }
                        } else {
                            // No match
                            card1.classList.remove('selected');
                            card2.classList.remove('selected');
                        }
                        
                        selectedCards = [];
                    }, 1000);
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
                isCorrect = matchedCards.length === task.data.pairs.length * 2;
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
        
        // Record answer
        const blockKey = `block_${this.currentBlock}`;
        const blockProgress = this.data.progress[blockKey];
        
        blockProgress.recentAnswers.push({
            taskId: task.id,
            correct: isCorrect
        });
        
        // Update progress
        if (isCorrect) {
            this.currentSession.correctCount++;
            
            // Add to correctly solved tasks if not already there
            if (!blockProgress.correctlySolvedTasks.includes(task.id)) {
                blockProgress.correctlySolvedTasks.push(task.id);
            }
        }
        
        // Show feedback
        this.showTaskFeedback(task, isCorrect, interactionArea);
        
        // Update difficulty based on adaptive logic
        this.updateDifficulty(blockKey, isCorrect);
        
        
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

    // Update difficulty based on adaptive learning logic
    updateDifficulty(blockKey, isCorrect) {
        const blockProgress = this.data.progress[blockKey];
        const recentAnswers = blockProgress.recentAnswers.slice(-4); // Last 4 answers
        
        if (isCorrect) {
            // Check for 3 consecutive correct answers
            const lastThree = blockProgress.recentAnswers.slice(-3);
            if (lastThree.length === 3 && lastThree.every(answer => answer.correct)) {
                blockProgress.currentDifficulty = Math.min(5, blockProgress.currentDifficulty + 1);
            }
        } else {
            // Check for 2 wrong answers in last 4
            const wrongCount = recentAnswers.filter(answer => !answer.correct).length;
            if (wrongCount >= 2) {
                // Try to find other tasks on same difficulty first
                const currentDiff = blockProgress.currentDifficulty;
                const blockTasks = this.tasks[this.currentBlock].tasks;
                const sameDiffTasks = blockTasks.filter(t => t.difficulty === currentDiff);
                const recentTaskIds = blockProgress.recentAnswers.map(a => a.taskId);
                const availableSameDiff = sameDiffTasks.filter(t => !recentTaskIds.includes(t.id));
                
                // Only reduce difficulty if no other tasks available on same level
                if (availableSameDiff.length === 0) {
                    blockProgress.currentDifficulty = Math.max(1, blockProgress.currentDifficulty - 1);
                }
            }
        }
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
        
        // Calculate correct answers properly - count unique tasks solved correctly
        const totalTasks = this.currentSession.tasks.length;
        let correctlyAnsweredTasks = 0;
        
        // Track which tasks were answered correctly at least once
        const taskCorrectStatus = {};
        
        // Go through recent answers for this session's tasks
        const blockKey = `block_${this.currentBlock}`;
        const recentAnswers = this.data.progress[blockKey].recentAnswers;
        const sessionTaskIds = this.currentSession.tasks.map(t => t.id);
        
        // Check each task in this session
        this.currentSession.tasks.forEach(task => {
            // Find the most recent answer for this task
            const taskAnswers = recentAnswers.filter(answer => answer.taskId === task.id);
            if (taskAnswers.length > 0) {
                // Check if the task was ever answered correctly in this session
                const hasCorrectAnswer = taskAnswers.some(answer => answer.correct);
                if (hasCorrectAnswer) {
                    correctlyAnsweredTasks++;
                }
            }
        });
        
        const percentage = Math.round((correctlyAnsweredTasks / totalTasks) * 100);
        
        interactionArea.innerHTML = `
            <div class="feedback success">
                <h3>Session abgeschlossen!</h3>
                <p>Du hast ${correctlyAnsweredTasks} von ${totalTasks} Aufgaben richtig gelöst (${percentage}%).</p>
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
        
        document.getElementById('hint-modal').classList.add('active');
    }

    // Close hint modal
    closeHint() {
        document.getElementById('hint-modal').classList.remove('active');
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
    window.termHeldApp = new TermHeldApp();
});