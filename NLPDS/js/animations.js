/**
 * Animation utilities for NLPDS Learning Platform
 * Handles count-up animations, chart transitions, and UI effects
 */

console.log('🔧 DEBUGGING: animations.js wird geladen...');

/**
 * Animates a number from 0 to target value with easing
 * @param {HTMLElement} element - Element to animate
 * @param {number} targetValue - Target value to count to
 * @param {number} duration - Animation duration in milliseconds
 * @param {function} easing - Easing function (optional)
 */
export function animateCounter(element, targetValue, duration = 1500, easing = easeOutQuint) {
    const startValue = 0;
    const startTime = Date.now();
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        
        const currentValue = Math.floor(startValue + (targetValue - startValue) * easedProgress);
        
        // Handle special formatting for percentages and time
        const text = element.textContent || element.innerText;
        if (text.includes('%')) {
            element.innerHTML = currentValue + '<span class="text-xl">%</span>';
        } else if (text.includes('min')) {
            element.innerHTML = currentValue + '<span class="text-xl">min</span>';
        } else if (text.includes('Tage')) {
            element.innerHTML = currentValue + '<span class="text-xl"> Tage</span>';
        } else {
            element.textContent = currentValue;
        }
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Automatically animates all elements with data-animate-counter attribute
 */
export function animateAllCounters() {
    const counterElements = document.querySelectorAll('[data-animate-counter]');
    
    counterElements.forEach((element, index) => {
        const targetValue = parseInt(element.getAttribute('data-animate-counter'), 10);
        if (!isNaN(targetValue)) {
            // Stagger animations for visual appeal
            setTimeout(() => {
                animateCounter(element, targetValue);
            }, index * 100);
        }
    });
}

/**
 * Animates progress bars with a delay
 */
export function animateProgressBars() {
    const progressBars = document.querySelectorAll('.bg-blue-500, .bg-green-500, .bg-indigo-500');
    
    progressBars.forEach((bar, index) => {
        // Reset width
        bar.style.width = '0%';
        
        // Get target width from inline style
        const targetWidth = bar.style.width || '0%';
        
        setTimeout(() => {
            bar.style.transition = 'width 1000ms ease-out';
            bar.style.width = targetWidth;
        }, 500 + index * 100);
    });
}

/**
 * Entrance animation for cards
 */
export function animateCardEntrance() {
    const cards = document.querySelectorAll('.bg-white, .bg-gradient-to-br');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 600ms ease-out, transform 600ms ease-out';
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 + index * 100);
    });
}

/**
 * Easing functions
 */
function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/**
 * Initialize page animations based on current page
 */
export function initializePageAnimations() {
    // Wait for DOM to be fully rendered
    setTimeout(() => {
        animateAllCounters();
        animateProgressBars();
        animateCardEntrance();
    }, 100);
}

/**
 * Leaderboard loading animation
 */
export function showLeaderboardLoading() {
    const loading = document.getElementById('leaderboard-loading');
    const content = document.getElementById('leaderboard-content');
    const empty = document.getElementById('leaderboard-empty');
    
    if (loading) loading.classList.remove('hidden');
    if (content) content.classList.add('hidden');
    if (empty) empty.classList.add('hidden');
}

/**
 * Show leaderboard content with animation
 */
export function showLeaderboardContent() {
    const loading = document.getElementById('leaderboard-loading');
    const content = document.getElementById('leaderboard-content');
    
    if (loading) loading.classList.add('hidden');
    if (content) {
        content.classList.remove('hidden');
        // Animate table rows
        const rows = content.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-10px)';
            row.style.transition = 'opacity 400ms ease-out, transform 400ms ease-out';
            
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }
}

/**
 * Show empty leaderboard state
 */
export function showLeaderboardEmpty() {
    const loading = document.getElementById('leaderboard-loading');
    const content = document.getElementById('leaderboard-content');
    const empty = document.getElementById('leaderboard-empty');
    
    if (loading) loading.classList.add('hidden');
    if (content) content.classList.add('hidden');
    if (empty) {
        empty.classList.remove('hidden');
        // Animate empty state
        empty.style.opacity = '0';
        empty.style.transform = 'translateY(20px)';
        empty.style.transition = 'opacity 600ms ease-out, transform 600ms ease-out';
        
        setTimeout(() => {
            empty.style.opacity = '1';
            empty.style.transform = 'translateY(0)';
        }, 100);
    }
}

/**
 * Achievement unlock animation
 */
export function animateAchievementUnlock(achievementElement) {
    if (!achievementElement) return;
    
    achievementElement.style.transform = 'scale(0.8)';
    achievementElement.style.opacity = '0';
    
    setTimeout(() => {
        achievementElement.style.transition = 'transform 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 500ms ease-out';
        achievementElement.style.transform = 'scale(1)';
        achievementElement.style.opacity = '1';
    }, 100);
}

console.log('✅ DEBUGGING: animations.js geladen');
