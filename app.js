// Math-Student Mathematics Learning Platform
// Version 5.0.0 - Client-side implementation

class MathStudentApp {
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
        let stored = localStorage.getItem('mathStudentData');
        
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
                localStorage.removeItem('mathStudentData');
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
        localStorage.setItem('mathStudentData', JSON.stringify(data));
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
        
        // Task interaction (hint button is added dynamically)
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

        questionArea.innerHTML = `
            <h2>Vereinfache! <button id="hint-btn" class="hint-question-mark">?</button></h2>
            <h3>${task.data.question}</h3>
        `;

        // Set up hint button event listener after creating it
        document.getElementById('hint-btn').onclick = () => this.showHint();

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

        // All tasks are now multiple choice
        this.renderMultipleChoice(task, container);
    }


    // Render multiple choice task
    renderMultipleChoice(task, container) {
        // Store the current options and state
        this.currentMultipleChoiceState = {
            correctSolution: task.data.correctSolution,
            currentOptionIndex: 0,
            shuffledOptions: [...task.data.options].sort(() => Math.random() - 0.5),
            isAnswered: false
        };

        // Create solution display area
        const solutionArea = document.createElement('div');
        solutionArea.className = 'multiple-choice-solution';

        // Show current option
        this.showNextOption(solutionArea);

        container.appendChild(solutionArea);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'multiple-choice-buttons';

        // Wrong answer button (red X)
        const wrongBtn = document.createElement('button');
        wrongBtn.className = 'choice-btn wrong-btn';
        wrongBtn.innerHTML = '❌';
        wrongBtn.onclick = () => this.handleMultipleChoiceAnswer(false, solutionArea, buttonContainer);

        // Correct answer button (green checkmark)
        const correctBtn = document.createElement('button');
        correctBtn.className = 'choice-btn correct-btn';
        correctBtn.innerHTML = '✅';
        correctBtn.onclick = () => this.handleMultipleChoiceAnswer(true, solutionArea, buttonContainer);

        buttonContainer.appendChild(wrongBtn);
        buttonContainer.appendChild(correctBtn);
        container.appendChild(buttonContainer);
    }

    // Show next option in multiple choice
    showNextOption(solutionArea) {
        const state = this.currentMultipleChoiceState;
        if (state.currentOptionIndex < state.shuffledOptions.length) {
            const currentOption = state.shuffledOptions[state.currentOptionIndex];
            solutionArea.innerHTML = `<div class="option-display">${currentOption}</div>`;
        }
    }

    // Handle multiple choice answer
    handleMultipleChoiceAnswer(userSaysCorrect, solutionArea, buttonContainer) {
        const state = this.currentMultipleChoiceState;
        if (state.isAnswered) return;

        const currentOption = state.shuffledOptions[state.currentOptionIndex];
        const isActuallyCorrect = currentOption === state.correctSolution;

        if (userSaysCorrect) {
            // User thinks this solution is correct
            if (isActuallyCorrect) {
                // User is right - this IS the correct solution
                state.isAnswered = true;
                solutionArea.innerHTML = `<div class="option-display correct">${currentOption}</div>`;
                this.showNextTaskButton(buttonContainer);
                this.processMultipleChoiceAnswer(this.currentSession.tasks[this.currentSession.currentIndex], true, currentOption);
            } else {
                // User is wrong - this is NOT the correct solution
                state.isAnswered = true;
                solutionArea.innerHTML = `<div class="option-display incorrect with-feedback">
                    <div class="solution-text">${currentOption}</div>
                    <small>Das war falsch. Richtig wäre: ${state.correctSolution}</small>
                </div>`;
                this.showNextTaskButton(buttonContainer);
                this.processMultipleChoiceAnswer(this.currentSession.tasks[this.currentSession.currentIndex], false, currentOption);
            }
        } else {
            // User thinks this solution is wrong
            if (isActuallyCorrect) {
                // User is wrong - this IS the correct solution but they rejected it
                state.isAnswered = true;
                solutionArea.innerHTML = `<div class="option-display incorrect with-feedback">
                    <div class="solution-text">${currentOption}</div>
                    <small>Das wäre richtig gewesen!</small>
                </div>`;
                this.showNextTaskButton(buttonContainer);
                this.processMultipleChoiceAnswer(this.currentSession.tasks[this.currentSession.currentIndex], false, currentOption);
            } else {
                // User is right - this is NOT the correct solution, show next option
                state.currentOptionIndex++;
                if (state.currentOptionIndex < state.shuffledOptions.length) {
                    // Show next option
                    this.showNextOption(solutionArea);
                } else {
                    // All options exhausted, show correct answer
                    state.isAnswered = true;
                    solutionArea.innerHTML = `<div class="option-display correct with-feedback">
                        <div class="solution-text">${state.correctSolution}</div>
                        <small>Das ist die richtige Lösung</small>
                    </div>`;
                    this.showNextTaskButton(buttonContainer);
                    this.processMultipleChoiceAnswer(this.currentSession.tasks[this.currentSession.currentIndex], false, state.correctSolution);
                }
            }
        }
    }

    // Show next task button
    showNextTaskButton(container) {
        container.innerHTML = '';
        const nextBtn = document.createElement('button');
        nextBtn.className = 'primary-btn';
        nextBtn.textContent = 'Nächste Aufgabe';
        nextBtn.onclick = () => this.nextTask();
        container.appendChild(nextBtn);
    }

    // Process multiple choice answer
    processMultipleChoiceAnswer(task, isCorrect, userAnswer) {
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

        // Save progress
        this.saveData();
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

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'feedback success';
        summaryDiv.innerHTML = `
            <h3>Session abgeschlossen!</h3>
            <p>${summaryMessage}</p>
        `;

        const returnBtn = document.createElement('button');
        returnBtn.className = 'primary-btn';
        returnBtn.textContent = 'Zurück zum Dashboard';
        returnBtn.style.marginTop = '20px';
        returnBtn.style.display = 'block';
        returnBtn.style.marginLeft = 'auto';
        returnBtn.style.marginRight = 'auto';
        returnBtn.onclick = () => this.exitTaskSession();

        interactionArea.innerHTML = '';
        interactionArea.appendChild(summaryDiv);
        interactionArea.appendChild(returnBtn);
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
            localStorage.removeItem('mathStudentData');
            
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
    window.app = new MathStudentApp();
    window.mathStudentApp = window.app;
});